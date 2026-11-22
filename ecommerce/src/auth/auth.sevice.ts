import { Injectable, UnauthorizedException, HttpStatus } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import UserRoleEnum from 'src/users/enums/userRoleEnum';
import { UsersService } from 'src/users/users.service';
import { AccountNeedsRestoreException } from 'src/common/account-suspended.exception';
import {
  RefreshToken,
  RefreshTokenStatus,
} from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // راه‌اندازی Refresh Token (rotation امن + ذخیره هش در دیتابیس)
  // ─────────────────────────────────────────────────────────────

  private get refreshSecret(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET_KEY');
  }

  private get refreshExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRATION') ?? '7d';
  }

  // هش توکن برای ذخیره در دیتابیس (self-توکن هرگز ذخیره نمی‌شود)
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private refreshExpiryDate(): Date {
    const ms = this.parseDurationToMs(this.refreshExpiresIn);
    return new Date(Date.now() + ms);
  }

  private parseDurationToMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // پیش‌فرض ۷ روز
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * multipliers[unit];
  }

  /**
   * ساخت یک توکن refresh جدید برای کاربر و ذخیره هش آن در دیتابیس.
   * توکن جدید به‌صورت JWT با سکرت جدا از access توکن امضا می‌شود.
   */
  private async issueRefreshToken(
    userId: number,
    ipAddress?: string,
  ): Promise<string> {
    // jti تصادفی → هر بار یک توکن یکتا بساز (حتی در همان ثانیه) تا collision نشود
    // و از آن به‌عنوان شناسهٔ منحصربه‌فرد برای revoke/rotation استفاده شود
    const jti = crypto.randomBytes(16).toString('hex');

    const token = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh', jti },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as JwtSignOptions['expiresIn'],
      },
    );

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        tokenHash: this.hashToken(token),
        userId,
        status: RefreshTokenStatus.Active,
        expiresAt: this.refreshExpiryDate(),
        ipAddress: ipAddress ?? null,
      }),
    );

    return token;
  }

  /**
   * تولید جفت توکن (access + refresh) — برای ورود و برای چرخش در rfrش.
   */
  private async generateTokenPair(
    payload: {
      mobile: string;
      sub: number;
      display_name: string;
      role: string;
    },
    ipAddress?: string,
  ) {
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.issueRefreshToken(payload.sub, ipAddress);
    return { accessToken, refreshToken };
  }

  async register(mobile: string, password: string, display_name: string) {
    const hashedPassword: string = await bcrypt.hash(password, 10);
    return this.usersService.create({
      display_name,
      password: hashedPassword,
      mobile,
      role: UserRoleEnum.NormalUser,
    });
  }
  // این کد فیلد های ورودی برای ثبت نام را غیر از رول میگیرد پسورد را هش میکند
  //  و برای ساختن یوزر به تابع کریت یوزر سرویس پاس میدهد و
  //  پسورد هش شده را جایگذاری مبکند در پسورد و رول را بصورت دیفالت
  //  روی نرمال یوزر میگذارد و باقی موارد هم همانگونه میفرستد

  async login(mobile: string, password: string) {
    // با withPassword=true هش پسورد صریحاً select می‌شود تا مقایسه bcrypt انجام شود.
    // checkExist=true تا وقتی کاربرِ فعال پیدا نشد exception پرتاب نکند
    // و بتوانیم بررسی «حساب غیرفعال» را در ادامه انجام دهیم.
    const user = await this.usersService.findOneMobile(mobile, true, true);

    // اگر با شمارهٔ ورودی، کاربرِ فعالی پیدا نشد، بررسی می‌کنیم آیا شماره متعلق به
    // حسابِ غیرفعال (soft-delete) است تا پیام دقیق‌تری بدهیم.
    if (!user) {
      const deletedUser =
        await this.usersService.findOneMobileWithDeleted(mobile);
      if (deletedUser)
        throw new AccountNeedsRestoreException(
          'حساب این شماره موبایل غیرفعال شده است؛ امکان ورود وجود ندارد. ' +
            'برای بازیابی، درخواست خود را از طریق POST /restore-request با همین شماره ثبت کنید',
          HttpStatus.UNAUTHORIZED,
        );
      throw new UnauthorizedException('user not found');
    }

    if (!(await bcrypt.compare(password, user.password)))
      throw new UnauthorizedException('password is wrong');

    const payload = {
      mobile: user.mobile,
      sub: user.id,
      display_name: user.display_name,
      role: user.role,
    };

    const tokens = await this.generateTokenPair(payload);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * تازه‌سازی access token با استفاده از refresh token (با rotation امن).
   * توکن قدیمی `replaced` می‌شود و توکن تازه‌ای صادر می‌گردد؛ بنابراین
   * یک refresh token فقط یک‌بار قابل استفاده است و اگر دزدیده و دوباره استفاده شود،
   * زنجیره‌ی توکن‌های قبلی را می‌توان باطل کرد.
   */
  async refresh(
    refreshToken: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: number; type?: string };
    try {
      payload = await this.jwtService.verifyAsync<{
        sub: number;
        type?: string;
      }>(refreshToken, { secret: this.refreshSecret });
    } catch {
      throw new UnauthorizedException('توکن تازه‌سازی نامعتبر یا منقضی است');
    }

    // فقط توکن‌های نوع refresh — نه access — پذیرفته می‌شوند
    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('توکن تازه‌سازی نامعتبر است');
    }

    const tokenHash = this.hashToken(refreshToken);
    const record = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!record || record.status !== RefreshTokenStatus.Active) {
      // توکن شناخته‌شده نیست یا قبلاً استفاده/باطل شده است
      throw new UnauthorizedException('توکن تازه‌سازی نامعتبر یا مصرف‌شده است');
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('توکن تازه‌سازی منقضی شده است');
    }

    // کاربر باید هنوز فعال باشد (soft-delete نشده باشد)
    if (record.user?.deletedAt) {
      throw new UnauthorizedException('حساب کاربری غیرفعال است');
    }

    // ── Rotation: توکن فعلی را `replaced` کن و توکن تازه بساز ──
    const newToken = await this.issueRefreshToken(record.userId, ipAddress);
    const newTokenHash = this.hashToken(newToken);

    await this.refreshTokenRepo.update(record.id, {
      status: RefreshTokenStatus.Replaced,
      replacedByTokenHash: newTokenHash,
      lastUsedAt: new Date(),
    });

    const payloadAccess = {
      mobile: record.user.mobile,
      sub: record.user.id,
      display_name: record.user.display_name,
      role: record.user.role,
    };

    const accessToken = this.jwtService.sign(payloadAccess);

    return { accessToken, refreshToken: newToken };
  }

  /**
   * باطل‌کردن (revoke) یک refresh token — معمولاً هنگام خروج کاربر.
   */
  async logout(refreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(refreshToken);
    const record = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
    });

    if (!record) return { message: 'خروج انجام شد' };

    await this.refreshTokenRepo.update(record.id, {
      status: RefreshTokenStatus.Revoked,
    });
    return { message: 'خروج انجام شد' };
  }

  /**
   * باطل‌کردن همه توکن‌های تازه‌سازیِ یک کاربر (در صورت به‌خطر افتادن یا خروج از همه دستگاه‌ها).
   */
  async revokeAllUserTokens(userId: number): Promise<{ message: string }> {
    const result = await this.refreshTokenRepo.update(
      { userId, status: RefreshTokenStatus.Active },
      { status: RefreshTokenStatus.Revoked },
    );
    return { message: `${result.affected ?? 0} توکن تازه‌سازی باطل شد` };
  }

  /**
   * پاک‌سازی دوره‌ای توکن‌های منقضی/باطل‌شده (هر بار با یک درخواست ورود/رfrش).
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }
}

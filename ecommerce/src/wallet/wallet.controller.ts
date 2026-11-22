import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TransactionStatus } from './enums/transaction-status';
import { GetUser } from 'src/decorators/get-user.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@ApiTags('Wallet')
@ApiBearerAuth('JWT-auth')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // ─────────────────────────────────────────────────────────────
  // IMPORTANT: static routes (me, transactions/me, transaction/:txId)
  // باید قبل از dynamic route (:userId) تعریف شوند
  // ─────────────────────────────────────────────────────────────

  // ========== کاربر لاگین‌شده ==========

  @Get('me')
  @ApiOperation({ summary: 'دریافت کیف پول کاربر لاگین‌شده' })
  getMyWallet(@GetUser('id') userId: number) {
    return this.walletService.getUserWallet(userId);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'شارژ کیف پول' })
  deposit(@GetUser('id') userId: number, @Body() dto: DepositDto) {
    return this.walletService.deposit(
      userId,
      dto.amount,
      'شارژ کیف پول',
      TransactionStatus.DEPOSIT,
    );
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'برداشت از کیف پول' })
  withdraw(@GetUser('id') userId: number, @Body() dto: WithdrawDto) {
    return this.walletService.withdraw(
      userId,
      dto.amount,
      'برداشت از کیف پول',
      TransactionStatus.WITHDRAW,
    );
  }

  @Get('transactions/me')
  // ← قبل از transactions/user/:userId و transactions/wallet/:walletId
  @ApiOperation({ summary: 'دریافت تراکنش‌های کاربر لاگین‌شده' })
  getMyTransactions(@GetUser('id') userId: number) {
    return this.walletService.getUserTransactions(userId);
  }

  @Get('transaction/:txId')
  // ← قبل از :userId
  @ApiOperation({ summary: 'جزئیات یک تراکنش (فقط تراکنش‌های خودت)' })
  @ApiParam({ name: 'txId', example: 1 })
  async getTransactionDetail(
    @Param('txId', ParseIntPipe) txId: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: string,
  ) {
    const tx = await this.walletService.getTransactionDetail(txId);

    // کاربر عادی فقط تراکنش‌های خودش رو می‌تواند ببیند
    if (userRole !== 'admin' && tx?.wallet?.user?.id !== userId) {
      throw new ForbiddenException('دسترسی به تراکنش‌های دیگران مجاز نیست');
    }
    return tx;
  }

  // ========== فقط ادمین ==========

  @Get('transactions/user/:userId')
  @Roles('admin')
  @ApiOperation({ summary: 'دریافت تراکنش‌های یک کاربر خاص (فقط ادمین)' })
  @ApiParam({ name: 'userId', example: 1 })
  getUserTransactions(@Param('userId', ParseIntPipe) userId: number) {
    return this.walletService.getUserTransactions(userId);
  }

  @Get('transactions/wallet/:walletId')
  @Roles('admin')
  @ApiOperation({ summary: 'دریافت تراکنش‌های یک کیف پول خاص (فقط ادمین)' })
  @ApiParam({ name: 'walletId', example: 1 })
  getWalletTx(@Param('walletId', ParseIntPipe) walletId: number) {
    return this.walletService.getWalletTransactions(walletId);
  }

  @Get(':userId')
  @Roles('admin')
  // ← این dynamic route باید آخر از همه باشد
  @ApiOperation({ summary: 'دریافت کیف پول هر کاربر (فقط ادمین)' })
  @ApiParam({ name: 'userId', example: 1 })
  getWallet(@Param('userId', ParseIntPipe) userId: number) {
    return this.walletService.getUserWallet(userId);
  }
}

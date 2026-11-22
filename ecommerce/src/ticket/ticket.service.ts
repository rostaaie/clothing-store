import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { IsNull, Like } from 'typeorm';

// فقط فیلدهایی از کاربر احراز هویت‌شده که برای کنترل دسترسی لازم است
export interface AuthUser {
  id: number;
  role: string;
}

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  // صاحب هر مکالمه، کاربرِ تیکت ریشه (تیکتی که id آن با rootTicketId برابر است) است.
  // ادمین به همه مکالمه‌ها دسترسی دارد و کاربر عادی فقط به مکالمه‌های خودش.
  // برای اینکه وجود یا نبود شناسه لو نرود، در هر دو حالت NotFound برمی‌گردد.
  private async assertCanAccessConversation(
    rootTicketId: string,
    user: AuthUser,
  ) {
    if (user.role === 'admin') return;

    const root = await this.ticketRepository.findOne({
      where: { id: rootTicketId },
    });

    if (!root || root.userId !== user.id) {
      throw new NotFoundException('Ticket not found');
    }
  }

  async create(
    createTicketDto: CreateTicketDto & { userId: number },
    user: AuthUser,
  ) {
    let rootTicketId: string;

    // اگر ریپلای باشد
    if (createTicketDto.replyToId) {
      const parentTicket = await this.ticketRepository.findOne({
        where: { id: createTicketDto.replyToId },
      });

      if (!parentTicket) throw new NotFoundException('Parent ticket not found');

      // کاربر عادی فقط می‌تواند به مکالمه خودش پاسخ بدهد
      await this.assertCanAccessConversation(parentTicket.rootTicketId, user);

      rootTicketId = parentTicket.rootTicketId;
    } else {
      // چون اولین تیکت است روت باید ایدی خودش باشد
      rootTicketId = uuid();
    }

    const ticket = this.ticketRepository.create({
      id: createTicketDto.replyToId ? undefined : rootTicketId,
      //                      condition ? valueIfTrue : valueIfFalse
      // اگر این تیکت ریپلایتوآیدی داشت، کاری به آیدی خود تیکت نذاشته باش، آندیفایند گذاشتیم که دیتابیس آیدیشو با یویوآیدی بسازه
      // اگر این تیکت ریپلایتوآیدی نداشت ، ایدی خودشو بکن روت تیکت آیدی که یعنی خودش اولین تیکت است
      ...createTicketDto,
      rootTicketId,
      //بعدش روت تیکت آیدیش رو بریز توی خودت تیکت که موقع ساخت بچسبه بهش
    });

    return await this.ticketRepository.save(ticket);
  }

  async findAll(page: number = 1, limit: number = 10, id?: string) {
    const where: any = {};
    if (id) where.id = Like(`%${id}%`);

    const [tickets, total] = await this.ticketRepository.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: tickets,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: AuthUser) {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      //new and safe way:
      relations: {
        user: true,
        replyTo: true,

        replies: {
          user: true,
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    await this.assertCanAccessConversation(ticket.rootTicketId, user);

    return ticket;
  }

  //گرفتن کل یک چت
  async getConversation(rootTicketId: string, user: AuthUser) {
    await this.assertCanAccessConversation(rootTicketId, user);

    const tickets = await this.ticketRepository.find({
      where: { rootTicketId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
    return tickets;
  }

  //گرفتن تب های چت ها
  async getThreads(page: number = 1, limit: number = 10, id?: string) {
    const where: any = { replyToId: IsNull() };
    if (id) where.id = Like(`%${id}%`);

    const [tickets, total] = await this.ticketRepository.findAndCount({
      where,
      relations: { user: true },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: tickets,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  //گرفتن تیکت های یک کاربر
  async findUserTickets(userId: number) {
    return await this.ticketRepository.find({
      where: { userId, replyToId: IsNull() },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  async remove(id: string) {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
    });
    if (!ticket) throw new NotFoundException('ticket not found');

    await this.ticketRepository.remove(ticket);
    return {
      message: 'ticket is deleted now',
    };
  }
}
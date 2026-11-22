import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpStatus,
  Query,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TicketService } from './ticket.service';
import type { AuthUser } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { GetUser } from 'src/decorators/get-user.decorator';
import { Roles } from 'src/decorators/roles.decorator';

@ApiTags('Tickets')
@ApiBearerAuth('JWT-auth')
@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  // ─────────────────────────────────────────────────────────────
  // IMPORTANT: در NestJS روت‌های static باید قبل از روت‌های dynamic
  // (:param) تعریف شوند وگرنه هیچوقت match نمی‌شوند
  // مثال: @Get('my-tickets') باید قبل از @Get(':id') باشد
  // ─────────────────────────────────────────────────────────────

  // ========== ادمین (static routes اول) ==========

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'دریافت همه تیکت‌ها با صفحه‌بندی (فقط ادمین)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'id',
    required: false,
    description: 'فیلتر بر اساس شناسه تیکت (جزئی)',
  })
  async findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('id') id?: string,
  ) {
    const tickets = await this.ticketService.findAll(page, limit, id);
    return {
      data: tickets,
      statusCode: HttpStatus.OK,
      message: 'همه تیکت‌ها دریافت شدند',
    };
  }

  @Get('threads')
  @Roles('admin')
  @ApiOperation({ summary: 'دریافت thread های اصلی تیکت‌ها (فقط ادمین)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'id',
    required: false,
    description: 'فیلتر بر اساس شناسه تیکت (جزئی)',
  })
  async getThreads(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('id') id?: string,
  ) {
    const threads = await this.ticketService.getThreads(page, limit, id);
    return {
      data: threads,
      statusCode: HttpStatus.OK,
      message: 'thread ها دریافت شدند',
    };
  }

  @Get('user/:userId')
  @Roles('admin')
  @ApiOperation({ summary: 'دریافت تیکت‌های یک کاربر خاص (فقط ادمین)' })
  @ApiParam({
    name: 'userId',
    example: 1,
    description: 'آیدی عددی کاربر (نه شماره موبایل)',
  })
  async findUserTickets(@Param('userId', ParseIntPipe) userId: number) {
    const tickets = await this.ticketService.findUserTickets(userId);
    return {
      data: tickets,
      statusCode: HttpStatus.OK,
      message: 'تیکت‌های کاربر دریافت شدند',
    };
  }

  // ========== کاربر (static routes قبل از dynamic) ==========

  @Post()
  @ApiOperation({ summary: 'ایجاد تیکت جدید' })
  async create(
    @GetUser() user: AuthUser,
    @Body() createTicketDto: CreateTicketDto,
  ) {
    const ticket = await this.ticketService.create(
      { ...createTicketDto, userId: user.id },
      user,
    );
    return {
      data: ticket,
      statusCode: HttpStatus.CREATED,
      message: 'تیکت ثبت شد',
    };
  }

  @Get('my-tickets')
  // ← این باید قبل از @Get(':id') باشد وگرنه هیچوقت اجرا نمی‌شود
  @ApiOperation({ summary: 'دریافت تمام تیکت‌های کاربر لاگین‌شده' })
  async getMyTickets(@GetUser('id') userId: number) {
    const tickets = await this.ticketService.findUserTickets(userId);
    return {
      data: tickets,
      statusCode: HttpStatus.OK,
      message: 'تیکت‌های شما دریافت شدند',
    };
  }

  @Get('conversation/:rootId')
  // ← این هم باید قبل از @Get(':id') باشد
  @ApiOperation({ summary: 'دریافت زنجیره مکالمه یک تیکت' })
  @ApiParam({ name: 'rootId', example: '550e8400-e29b-41d4-a716-446655440000' })
  async getConversation(
    @Param('rootId', ParseUUIDPipe) rootId: string,
    @GetUser() user: AuthUser,
  ) {
    const conversation = await this.ticketService.getConversation(
      rootId,
      user,
    );
    return {
      data: conversation,
      statusCode: HttpStatus.OK,
      message: 'مکالمه دریافت شد',
    };
  }

  @Get(':id')
  // ← dynamic route باید آخر از همه باشد
  @ApiOperation({ summary: 'دریافت یک تیکت بر اساس آیدی' })
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: AuthUser,
  ) {
    const ticket = await this.ticketService.findOne(id, user);
    return { data: ticket, statusCode: HttpStatus.OK, message: 'تیکت یافت شد' };
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'حذف تیکت (فقط ادمین)' })
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.ticketService.remove(id);
    return { data: null, statusCode: HttpStatus.OK, message: 'تیکت حذف شد' };
  }
}
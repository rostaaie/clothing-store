import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  BadRequestException,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { GetUser } from 'src/decorators/get-user.decorator';
import { Roles } from 'src/decorators/roles.decorator';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@Controller('orders')
export class OrdersController {
  constructor(private orderService: OrdersService) {}

  // ─────────────────────────────────────────────────────────────
  // IMPORTANT: روت‌های static باید قبل از dynamic (:id) باشند
  // ─────────────────────────────────────────────────────────────

  // ========== کاربر لاگین‌شده ==========

  @Get('my-orders')
  // ← قبل از @Get(':id') — وگرنه 'my-orders' به عنوان id گرفته می‌شود
  @ApiOperation({ summary: 'دریافت همه سفارشات کاربر لاگین‌شده' })
  async getMyOrders(@GetUser('id') userId: number) {
    return this.orderService.getUserOrders(userId);
  }

  @Get('verify')
  @ApiOperation({ summary: 'تایید پرداخت (callback از درگاه)' })
  @ApiQuery({ name: 'orderId', example: 1 })
  @ApiQuery({
    name: 'Authority',
    required: false,
    example: 'FAKE_AUTH_123',
    description: 'کد پیگیری صادرشده توسط درگاه هنگام درخواست پرداخت',
  })
  async verifyPayment(
    @Query('orderId') orderId: number,
    @GetUser('id') userId: number,
    @Query() paymentData: any,
  ) {
    if (!orderId) throw new BadRequestException('orderId الزامی است');
    return this.orderService.verifyPayment(orderId, paymentData, userId);
  }

  @Post('create')
  @ApiOperation({
    summary: 'ثبت سفارش جدید از سبد خرید کاربر (نیازمند آدرس معتبر)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['addressId'],
      properties: {
        addressId: {
          type: 'number',
          example: 1,
          description: 'شناسه آدرس کاربر (الزامی)',
        },
        discountCode: {
          type: 'string',
          example: 'SAVE10',
          description: 'کد تخفیف (اختیاری)',
        },
        paymentMethod: {
          type: 'string',
          enum: ['GATEWAY', 'WALLET'],
          example: 'GATEWAY',
          description:
            'روش پرداخت: GATEWAY = درگاه، WALLET = پرداخت همان لحظه با کیف پول',
        },
      },
    },
  })
  async createOrder(
    @GetUser('id') userId: number,
    @Body('addressId') addressId: number,
    @Body('discountCode') discountCode: string,
    @Body('paymentMethod') paymentMethod: string,
  ) {
    if (!addressId) {
      throw new BadRequestException(
        'برای ثبت سفارش، ابتدا باید یک آدرس انتخاب کنید',
      );
    }
    // WALLET = پرداخت همان لحظه با کیف پول؛ هر مقدار دیگر = درگاه پرداخت
    const method = paymentMethod === 'WALLET' ? 'WALLET' : 'GATEWAY';
    return this.orderService.createOrder(
      userId,
      addressId,
      discountCode,
      method,
    );
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'درخواست پرداخت برای یک سفارش' })
  @ApiParam({ name: 'id', example: 1 })
  async requestPayment(
    @Param('id', ParseIntPipe) orderId: number,
    @GetUser('id') userId: number,
  ) {
    return this.orderService.requestPayment(orderId, userId);
  }

  @Post(':id/pay-with-wallet')
  @ApiOperation({ summary: 'پرداخت سفارش با کیف پول' })
  @ApiParam({ name: 'id', example: 1 })
  async payWithWallet(
    @Param('id', ParseIntPipe) orderId: number,
    @GetUser('id') userId: number,
  ) {
    return this.orderService.payWithWallet(orderId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'دریافت جزئیات یک سفارش (فقط سفارش خودت)' })
  @ApiParam({ name: 'id', example: 1 })
  async getOrder(
    @Param('id', ParseIntPipe) orderId: number,
    @GetUser('id') userId: number,
    @GetUser('role') userRole: string,
  ) {
    const order = await this.orderService.getOrder(orderId);
    if (!order) throw new BadRequestException('سفارش یافت نشد');

    // کاربر عادی فقط سفارش خودش رو می‌تواند ببیند
    if (userRole !== 'admin' && order.user?.id !== userId) {
      throw new ForbiddenException('دسترسی به سفارش دیگران مجاز نیست');
    }
    return order;
  }

  // ========== فقط ادمین ==========

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'دریافت همه سفارش‌ها با صفحه‌بندی و فیلتر (فقط ادمین)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, example: 'PENDING' })
  @ApiQuery({ name: 'userId', required: false, example: 1 })
  @ApiQuery({
    name: 'orderId',
    required: false,
    example: 59,
    description: 'فیلتر بر اساس شناسه سفارش',
  })
  async findAllOrders(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('status') status: string,
    @Query('userId') userId: number,
    @Query('orderId') orderId: number,
  ) {
    return this.orderService.findAllOrders({
      page,
      limit,
      status,
      userId,
      orderId,
    });
  }

  @Post(':id/cancel')
  @Roles('admin')
  @ApiOperation({ summary: 'لغو سفارش در انتظار پرداخت (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1 })
  async cancelOrder(@Param('id', ParseIntPipe) orderId: number) {
    return this.orderService.cancelOrder(orderId);
  }

  @Post(':id/refund')
  @Roles('admin')
  @ApiOperation({ summary: 'استرداد وجه سفارش (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1 })
  async refundOrder(
    @Param('id', ParseIntPipe) orderId: number,
    @Body('userId') userId: number,
  ) {
    return this.orderService.refundOrder(orderId, userId);
  }
}

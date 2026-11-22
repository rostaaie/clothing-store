import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BasketItemsService } from './basket_items.service';
import { BasketDto } from './dto/basket.dto';
import { GetUser } from 'src/decorators/get-user.decorator';
import { Roles } from 'src/decorators/roles.decorator';

@ApiTags('Basket')
@ApiBearerAuth('JWT-auth')
@Controller('basket-items')
export class BasketItemsController {
  constructor(private readonly basketItemsService: BasketItemsService) {}

  @Get('user/:userId')
  @Roles('admin')
  @ApiOperation({
    summary: 'مشاهده سبد خرید یک کاربر خاص (فقط ادمین، فقط جهت مشاهده)',
  })
  @ApiParam({ name: 'userId', example: 1 })
  async findUserBasket(@Param('userId', ParseIntPipe) userId: number) {
    const items = await this.basketItemsService.getUserBasket(userId);
    return {
      data: items,
      statusCode: HttpStatus.OK,
      message: 'سبد خرید کاربر دریافت شد',
    };
  }

  @Post()
  @ApiOperation({ summary: 'افزودن محصول به سبد خرید' })
  async create(@GetUser('id') userId: number, @Body() dto: BasketDto) {
    const item = await this.basketItemsService.addToBasket(userId, dto);
    return {
      data: item,
      statusCode: HttpStatus.CREATED,
      message: 'محصول به سبد خرید اضافه شد',
    };
  }

  @Get()
  @ApiOperation({ summary: 'دریافت سبد خرید کاربر لاگین‌شده' })
  async findAll(@GetUser('id') userId: number) {
    const items = await this.basketItemsService.getUserBasket(userId);
    return {
      data: items,
      statusCode: HttpStatus.OK,
      message: 'سبد خرید دریافت شد',
    };
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'حذف یک محصول از سبد خرید' })
  @ApiParam({
    name: 'productId',
    example: 1,
    description: 'آیدی محصول برای حذف از سبد',
  })
  @ApiQuery({
    name: 'variantId',
    required: false,
    example: 5,
    description: 'آیدی ترکیب سایز/رنگ (اگر محصول variant دارد)',
  })
  async remove(
    @GetUser('id') userId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Query('variantId') variantId?: string,
  ) {
    const result = await this.basketItemsService.removeItem(
      userId,
      productId,
      variantId ? Number(variantId) : undefined,
    );
    return {
      data: result,
      statusCode: HttpStatus.OK,
      message: 'محصول از سبد خرید حذف شد',
    };
  }
}

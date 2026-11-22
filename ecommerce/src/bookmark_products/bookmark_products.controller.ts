import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BookmarkProductsService } from './bookmark_products.service';
import { BookmarkProductDto } from './dto/bookmark_product.dto';
import { GetUser } from 'src/decorators/get-user.decorator';

@ApiTags('Bookmarks')
@ApiBearerAuth('JWT-auth')
@Controller('bookmark-products')
export class BookmarkProductsController {
  constructor(
    private readonly bookmarkProductsService: BookmarkProductsService,
  ) {}

  @Get('my-bookmarks')
  @ApiOperation({ summary: 'دریافت لیست محصولات نشانه‌گذاری‌شده توسط کاربر' })
  async getMyBookmarks(@GetUser('id') userId: number) {
    const bookmarks =
      await this.bookmarkProductsService.getUserBookmarks(userId);
    return {
      statusCode: HttpStatus.OK,
      message: 'لیست نشانه‌گذاری‌ها',
      data: bookmarks,
    };
  }

  @Post()
  @ApiOperation({ summary: 'نشانه‌گذاری یک محصول' })
  async bookmarking(
    @GetUser('id') userId: number,
    @Body() dto: BookmarkProductDto,
  ) {
    const bookmarked = await this.bookmarkProductsService.bookmarkProduct(
      userId,
      dto,
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: 'محصول نشانه‌گذاری شد',
      data: bookmarked,
    };
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'حذف نشانه‌گذاری محصول' })
  @ApiParam({
    name: 'productId',
    example: 1,
    description: 'آیدی محصول برای حذف نشانه‌گذاری',
  })
  async removeBookmark(
    @GetUser('id') userId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    await this.bookmarkProductsService.unbookmarkProduct(userId, productId);
    return { statusCode: HttpStatus.OK, message: 'نشانه‌گذاری حذف شد' };
  }
}

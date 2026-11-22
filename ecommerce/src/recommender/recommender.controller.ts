import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RecommenderService } from './recommender.service';
import { GetUser } from 'src/decorators/get-user.decorator';
import { Public } from 'src/decorators/public.decorator';

@ApiTags('Recommender')
@Controller('recommender')
export class RecommenderController {
  constructor(private readonly recommenderService: RecommenderService) {}

  /**
   * محصولات مشابه بر اساس دسته‌بندی و قیمت نزدیک (عمومی)
   */
  @Public()
  @Get('similar/:productId')
  @ApiOperation({
    summary: 'محصولات مشابه یک محصول (عمومی)',
    description:
      'بر اساس بیشترین اشتراک دسته‌بندی و نزدیکی قیمت (نسبت به خود استخر نتایج) رتبه‌بندی می‌شود',
  })
  @ApiParam({ name: 'productId', example: 1, description: 'آیدی محصول' })
  async getSimilar(@Param('productId', ParseIntPipe) productId: number) {
    const products =
      await this.recommenderService.getSimilarProducts(productId);
    return {
      statusCode: HttpStatus.OK,
      message: 'محصولات مشابه',
      data: products,
    };
  }

  /**
   * محصولاتی که معمولاً کنار این محصول خریده می‌شوند (عمومی)
   */
  @Public()
  @Get('bought-together/:productId')
  @ApiOperation({
    summary: 'محصولاتی که کنار این محصول خریده شده‌اند (عمومی)',
    description:
      'فقط سفارش‌های پرداخت‌شده؛ رتبه‌بندی با شاخص lift تا محصولات پرفروشِ عمومی که با همه خریده می‌شوند بالا نیایند',
  })
  @ApiParam({ name: 'productId', example: 1, description: 'آیدی محصول' })
  async getBoughtTogether(@Param('productId', ParseIntPipe) productId: number) {
    const products =
      await this.recommenderService.getFrequentlyBoughtTogether(productId);
    return {
      statusCode: HttpStatus.OK,
      message: 'محصولات اغلب خریداری‌شده همراه این محصول',
      data: products,
    };
  }

  /**
   * پیشنهاد شخصی‌سازی‌شده (نیاز به لاگین دارد)
   * امتیازمحور: خرید PAID + بوکمارک + بازدید با decay زمانی؛
   * بدون تاریخچه → پرفروش‌ها؛ بخشی از لیست برای کشف و تنوع رزرو می‌شود
   */
  @Get('for-me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'پیشنهاد محصول بر اساس علاقه‌مندی‌های کاربر (نیاز به لاگین)',
    description:
      'پروفایل علاقه‌مندی از خریدهای پرداخت‌شده، بوکمارک‌ها و بازدیدها با کاهش وزن زمانی ساخته می‌شود. ' +
      'کاربر بدون تاریخچه پرفروش‌ترین‌ها را می‌بیند و حدود یک‌چهارم لیست به محصولات کشفی اختصاص دارد.',
  })
  async getForMe(
    @GetUser('id') userId: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const products =
      await this.recommenderService.getPersonalizedRecommendations(
        userId,
        limit,
      );
    return {
      statusCode: HttpStatus.OK,
      message: 'پیشنهادهای ویژه شما',
      data: products,
    };
  }

  /**
   * پرفروش‌ترین محصولات (عمومی)
   */
  @Public()
  @Get('top-selling')
  @ApiOperation({
    summary: 'پرفروش‌ترین محصولات (عمومی)',
    description: 'محصولاتی که بیشترین تعداد فروش را داشته‌اند',
  })
  async getTopSelling() {
    const products = await this.recommenderService.getTopSellingProducts(10);
    return {
      statusCode: HttpStatus.OK,
      message: 'پرفروش‌ترین محصولات',
      data: products,
    };
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { GetUser } from 'src/decorators/get-user.decorator';
import { imageUploadOptions } from 'src/common/multer-storage';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ========== عمومی ==========

  @Public()
  @Get()
  @ApiOperation({ summary: 'دریافت لیست همه محصولات (عمومی)' })
  async findAll() {
    const products = await this.productsService.findAll();
    return {
      data: products,
      statusCode: HttpStatus.OK,
      message: 'لیست محصولات با موفقیت دریافت شد',
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'دریافت جزئیات یک محصول (عمومی)' })
  @ApiParam({ name: 'id', example: 1, description: 'آیدی محصول' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const product = await this.productsService.findOne(id);

    // ثبت بازدید برای کاربران لاگین‌شده (جهت سیستم پیشنهاد)
    if (req.user?.id) {
      this.productsService.trackView(req.user.id, id).catch(() => {});
    }

    return {
      data: product,
      statusCode: HttpStatus.OK,
      message: 'محصول یافت شد',
    };
  }

  // ========== فقط ادمین ==========

  @Post()
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ایجاد محصول جدید (فقط ادمین)' })
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return {
      data: product,
      statusCode: HttpStatus.CREATED,
      message: 'محصول با موفقیت ایجاد شد',
    };
  }

  @Post(':id/image')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'آپلود تصویر محصول (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1, description: 'آیدی محصول' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('products')))
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('فایل تصویر ارسال نشده است');
    const product = await this.productsService.setImage(
      id,
      `/uploads/products/${file.filename}`,
    );
    return {
      data: product,
      statusCode: HttpStatus.OK,
      message: 'تصویر محصول با موفقیت آپلود شد',
    };
  }

  @Patch(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ویرایش محصول (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1, description: 'آیدی محصول' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const product = await this.productsService.update(id, updateProductDto);
    return {
      data: product,
      statusCode: HttpStatus.OK,
      message: 'محصول با موفقیت ویرایش شد',
    };
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'حذف محصول (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1, description: 'آیدی محصول' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'محصول با موفقیت حذف شد',
    };
  }
}

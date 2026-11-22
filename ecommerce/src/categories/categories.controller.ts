import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { imageUploadOptions } from 'src/common/multer-storage';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ========== عمومی ==========

  @Public()
  @Get()
  @ApiOperation({ summary: 'دریافت لیست دسته‌بندی‌ها (عمومی)' })
  async findAll() {
    const categories = await this.categoriesService.findAll();
    return {
      data: categories,
      statusCode: HttpStatus.OK,
      message: 'دسته‌بندی‌ها دریافت شدند',
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'دریافت یک دسته‌بندی (عمومی)' })
  @ApiParam({ name: 'id', example: 1 })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const category = await this.categoriesService.findOne(id);
    return {
      data: category,
      statusCode: HttpStatus.OK,
      message: 'دسته‌بندی یافت شد',
    };
  }

  // ========== فقط ادمین ==========

  @Post()
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ایجاد دسته‌بندی جدید (فقط ادمین)' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const category = await this.categoriesService.create(createCategoryDto);
    return {
      data: category,
      statusCode: HttpStatus.CREATED,
      message: 'دسته‌بندی ایجاد شد',
    };
  }

  @Post(':id/image')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'آپلود تصویر دسته‌بندی (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('categories')))
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('فایل تصویر ارسال نشده است');
    const category = await this.categoriesService.setImage(
      id,
      `/uploads/categories/${file.filename}`,
    );
    return {
      data: category,
      statusCode: HttpStatus.OK,
      message: 'تصویر دسته‌بندی با موفقیت آپلود شد',
    };
  }

  @Patch(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'ویرایش دسته‌بندی (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1 })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.update(id, updateCategoryDto);
    return {
      data: category,
      statusCode: HttpStatus.OK,
      message: 'دسته‌بندی ویرایش شد',
    };
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'حذف دسته‌بندی (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1 })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.categoriesService.removeOnlyCategory(id);
    return { statusCode: HttpStatus.OK, message: 'دسته‌بندی حذف شد' };
  }
}

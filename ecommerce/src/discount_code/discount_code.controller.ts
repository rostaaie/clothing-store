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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DiscountCodeService } from './discount_code.service';
import { CreateDiscountCodeDto } from './dto/create-discount_code.dto';
import { UpdateDiscountCodeDto } from './dto/update-discount_code.dto';
import { Roles } from 'src/decorators/roles.decorator';

@ApiTags('Discount Codes')
@ApiBearerAuth('JWT-auth')
@Roles('admin')
@Controller('discount-codes')
export class DiscountCodeController {
  constructor(private readonly discountCodeService: DiscountCodeService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد کد تخفیف جدید (فقط ادمین)' })
  async create(@Body() dto: CreateDiscountCodeDto) {
    const code = await this.discountCodeService.create(dto);
    return {
      data: code,
      statusCode: HttpStatus.CREATED,
      message: 'کد تخفیف ایجاد شد',
    };
  }

  @Get()
  @ApiOperation({ summary: 'دریافت همه کدهای تخفیف (فقط ادمین)' })
  async findAll() {
    const codes = await this.discountCodeService.findAll();
    return {
      data: codes,
      statusCode: HttpStatus.OK,
      message: 'کدهای تخفیف دریافت شدند',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'دریافت یک کد تخفیف (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1 })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const code = await this.discountCodeService.findOne(id);
    return {
      data: code,
      statusCode: HttpStatus.OK,
      message: 'کد تخفیف یافت شد',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش کد تخفیف (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1 })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDiscountCodeDto,
  ) {
    const code = await this.discountCodeService.update(id, dto);
    return {
      data: code,
      statusCode: HttpStatus.OK,
      message: 'کد تخفیف ویرایش شد',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف کد تخفیف (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1 })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.discountCodeService.remove(id);
    return { statusCode: HttpStatus.OK, message: 'کد تخفیف حذف شد' };
  }
}

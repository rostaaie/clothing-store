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
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { GetUser } from 'src/decorators/get-user.decorator';

@ApiTags('Address')
@ApiBearerAuth('JWT-auth')
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @ApiOperation({ summary: 'افزودن آدرس جدید برای کاربر لاگین‌شده' })
  async create(
    @GetUser('id') userId: number,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    const address = await this.addressService.create(createAddressDto, userId);
    return {
      statusCode: HttpStatus.CREATED,
      data: address,
      message: 'آدرس اضافه شد',
    };
  }

  @Get()
  @ApiOperation({ summary: 'دریافت آدرس‌های کاربر لاگین‌شده' })
  async findAll(@GetUser('id') userId: number) {
    const addresses = await this.addressService.findAllByUser(userId);
    return {
      statusCode: HttpStatus.OK,
      data: addresses,
      message: 'آدرس‌ها دریافت شدند',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'دریافت یک آدرس خاص' })
  @ApiParam({ name: 'id', example: 1 })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    const address = await this.addressService.findOne(id, userId);
    return {
      statusCode: HttpStatus.OK,
      data: address,
      message: 'آدرس یافت شد',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش آدرس' })
  @ApiParam({ name: 'id', example: 1 })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    const address = await this.addressService.update(
      id,
      updateAddressDto,
      userId,
    );
    return {
      statusCode: HttpStatus.OK,
      data: address,
      message: 'آدرس ویرایش شد',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف آدرس' })
  @ApiParam({ name: 'id', example: 1 })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    await this.addressService.remove(id, userId);
    return { statusCode: HttpStatus.OK, message: 'آدرس حذف شد' };
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpStatus,
  Query,
  Put,
  Patch,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from 'src/decorators/roles.decorator';
import { GetUser } from 'src/decorators/get-user.decorator';
import UserRoleEnum from './enums/userRoleEnum';
import { plainToInstance } from 'class-transformer';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد کاربر جدید (فقط ادمین)' })
  async create(@Body() createUserDto: CreateUserDto) {
    const createUser = await this.usersService.create(createUserDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'کاربر ایجاد شد',
      data: createUser,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'دریافت لیست کاربران با فیلتر و صفحه‌بندی (فقط ادمین)',
  })
  @ApiQuery({
    name: 'role',
    enum: UserRoleEnum,
    required: false,
    description: 'فیلتر بر اساس نقش',
  })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  async findAll(
    @Query('role') role?: UserRoleEnum,
    @Query('limit') limit: number = 10,
    @Query('page') page: number = 1,
  ) {
    const users = await this.usersService.findAll(role, limit, page);
    return { statusCode: HttpStatus.OK, message: 'لیست کاربران', data: users };
  }

  @Get(':id')
  @ApiOperation({ summary: 'دریافت اطلاعات یک کاربر (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1 })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      message: `کاربر ${id} یافت شد`,
      data: user,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'ویرایش کاربر (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1 })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const updateUserDto = plainToInstance(UpdateUserDto, body, {
      excludeExtraneousValues: true,
    });
    const user = await this.usersService.update(id, updateUserDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'کاربر ویرایش شد',
      data: user,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'حذف کاربر (غیرفعال‌سازی حساب) — سفارش‌ها و تاریخچه حفظ می‌شود (فقط ادمین)',
  })
  @ApiParam({ name: 'id', example: 1 })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') currentUserId: number,
  ) {
    const result = await this.usersService.remove(id, currentUserId);
    return { statusCode: HttpStatus.OK, message: result.message };
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'بازگردانی کاربر حذف‌شده (فقط ادمین)' })
  @ApiParam({ name: 'id', example: 1 })
  async restore(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.restore(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'کاربر بازگردانی شد',
      data: user,
    };
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RestoreRequestService } from './restore-request.service';
import { RequestRestoreDto } from './dto/request-restore.dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/roles.decorator';

@ApiTags('Restore Request')
@Controller('restore-request')
export class RestoreRequestController {
  constructor(private readonly service: RestoreRequestService) {}

  // ========== عمومی (بدون لاگین) ==========

  @Public()
  @Post()
  @ApiOperation({
    summary:
      'ثبت درخواست بازیابی حساب غیرفعال‌شده (بدون نیاز به لاگین، فقط با شماره موبایل)',
  })
  async create(@Body() dto: RequestRestoreDto) {
    const data = await this.service.create(dto.mobile);
    return {
      statusCode: HttpStatus.CREATED,
      message:
        'درخواست بازیابی ثبت شد؛ پس از تأیید پشتیبانی، حساب شما فعال می‌شود',
      data,
    };
  }

  // ========== ادمین ==========

  @Get()
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'لیست درخواست‌های بازیابی (فقط ادمین)' })
  async findAll(@Query('status') status?: 'pending' | 'approved' | 'rejected') {
    const data = await this.service.findAll(status);
    return { statusCode: HttpStatus.OK, message: 'درخواست‌های بازیابی', data };
  }

  @Patch(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'تأیید/رد درخواست توسط ادمین — سپس بازیابی واقعی از users/:id/restore انجام می‌شود',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'approved' | 'rejected'; note?: string },
  ) {
    const data = await this.service.updateStatus(id, body.status, body.note);
    return {
      statusCode: HttpStatus.OK,
      message: 'وضعیت درخواست به‌روزرسانی شد',
      data,
    };
  }

  @Patch(':id/approve')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'تأیید درخواست و بازگردانیِ واقعی حساب کاربر غیرفعال (فقط ادمین)',
  })
  async approveAndRestore(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { note?: string },
  ) {
    const data = await this.service.approveAndRestore(id, body?.note);
    return {
      statusCode: HttpStatus.OK,
      message: 'درخواست تأیید و حساب کاربر بازگردانی شد',
      data,
    };
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'حذف درخواست بازیابی (فقط ادمین)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.remove(id);
    return { statusCode: HttpStatus.OK, message: data.message };
  }
}

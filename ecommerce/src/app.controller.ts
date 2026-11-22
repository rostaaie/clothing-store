import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'بررسی وضعیت سرور' })
  healthCheck() {
    return {
      status: 'ok',
      message: 'سرور فروشگاه اینترنتی آنلاین است',
      timestamp: new Date().toISOString(),
      docs: '/api',
    };
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ example: 'مشکل در پرداخت سفارش', description: 'عنوان تیکت' })
  @IsString({ message: 'عنوان باید متن باشد' })
  @IsNotEmpty({ message: 'عنوان الزامی است' })
  @MinLength(5, { message: 'عنوان باید حداقل 5 کاراکتر باشد' })
  @MaxLength(100, { message: 'عنوان باید حداکثر 100 کاراکتر باشد' })
  title: string;

  @ApiProperty({ example: 'پشتیبانی فنی', description: 'موضوع تیکت' })
  @IsString({ message: 'موضوع باید متن باشد' })
  @IsNotEmpty({ message: 'موضوع الزامی است' })
  subject: string;

  @ApiProperty({
    example:
      'هنگام پرداخت با کارت بانکی، درگاه خطا می‌دهد و مبلغ کسر شده ولی سفارش تایید نشده',
    description: 'توضیحات کامل مشکل',
  })
  @IsString({ message: 'توضیحات باید متن باشد' })
  @IsNotEmpty({ message: 'توضیحات الزامی است' })
  @MinLength(10, { message: 'توضیحات باید حداقل 10 کاراکتر باشد' })
  description: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'آیدی تیکت والد در صورت پاسخ دادن به تیکت قبلی',
  })
  @IsOptional()
  @IsUUID('4', { message: 'آیدی تیکت والد باید UUID معتبر باشد' })
  replyToId?: string;
}

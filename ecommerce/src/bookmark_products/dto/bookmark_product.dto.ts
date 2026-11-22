import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

export class BookmarkProductDto {
  @ApiProperty({
    example: 1,
    description: 'آیدی محصولی که می‌خواهید نشانه‌گذاری کنید',
  })
  @IsNotEmpty({ message: 'آیدی محصول الزامی است' })
  @IsInt({ message: 'آیدی محصول باید عدد صحیح باشد' })
  @Type(() => Number)
  productId: number;
}

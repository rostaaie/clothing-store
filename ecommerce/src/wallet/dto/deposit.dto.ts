import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class DepositDto {
  @ApiProperty({ example: 500000, description: 'مبلغ شارژ به تومان' })
  @IsInt({ message: 'مبلغ باید عدد صحیح باشد' })
  @Min(1000, { message: 'حداقل مبلغ شارژ 1000 تومان است' })
  @Type(() => Number)
  amount: number;
}

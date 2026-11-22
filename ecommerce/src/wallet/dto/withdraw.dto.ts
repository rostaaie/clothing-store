import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class WithdrawDto {
  @ApiProperty({ example: 200000, description: 'مبلغ برداشت به تومان' })
  @IsInt({ message: 'مبلغ باید عدد صحیح باشد' })
  @Min(1000, { message: 'حداقل مبلغ برداشت 1000 تومان است' })
  @Type(() => Number)
  amount: number;
}

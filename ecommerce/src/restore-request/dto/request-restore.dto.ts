import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RequestRestoreDto {
  @ApiProperty({ example: '09123456789' })
  @IsNotEmpty()
  @IsString()
  mobile: string;
}

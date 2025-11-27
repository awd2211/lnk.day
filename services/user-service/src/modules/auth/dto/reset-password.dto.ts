import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: '重置密码 Token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: '新密码 (至少8位，包含大小写字母和数字)' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: '密码必须包含大写字母、小写字母和数字',
  })
  newPassword: string;
}

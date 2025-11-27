import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPasswordDto {
  @ApiProperty({
    description: 'Password to protect the link',
    example: 'mySecurePassword123',
    minLength: 4,
  })
  @IsString()
  @MinLength(4)
  password: string;
}

export class VerifyPasswordDto {
  @ApiProperty({
    description: 'Password to verify',
    example: 'mySecurePassword123',
  })
  @IsString()
  password: string;
}

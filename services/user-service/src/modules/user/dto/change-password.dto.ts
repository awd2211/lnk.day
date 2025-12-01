import { IsString, IsNotEmpty, MinLength, Matches, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { validatePasswordStrength } from '../../../common/utils/password-strength.util';

@ValidatorConstraint({ name: 'passwordStrength', async: false })
export class PasswordStrengthConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!password) return false;
    const result = validatePasswordStrength(password);
    return result.valid;
  }

  defaultMessage(args: ValidationArguments): string {
    const password = args.value as string;
    if (!password) return '密码不能为空';
    const result = validatePasswordStrength(password);
    return result.errors.join('；');
  }
}

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsString()
  @IsNotEmpty({ message: '当前密码不能为空' })
  currentPassword: string;

  @ApiProperty({ description: '新密码 (至少8位，包含大小写字母和数字)' })
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(8, { message: '密码至少需要 8 个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: '密码必须包含大写字母、小写字母和数字',
  })
  @Validate(PasswordStrengthConstraint)
  newPassword: string;
}

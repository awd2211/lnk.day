import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'My Team' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'my-team' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;
}

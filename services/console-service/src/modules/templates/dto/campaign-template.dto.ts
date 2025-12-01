import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CampaignScenario } from '../entities/campaign-template-preset.entity';

class CampaignGoalsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  clicks?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  conversions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  revenue?: number;
}

class CampaignSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoArchive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnGoal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyBudget?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;
}

export class CreateCampaignTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    enum: [
      'holiday_promotion',
      'new_product_launch',
      'flash_sale',
      'seasonal_campaign',
      'brand_awareness',
      'lead_generation',
      'event_marketing',
      'influencer_collaboration',
      'referral_program',
      'newsletter',
      'other',
    ],
  })
  @IsOptional()
  @IsEnum([
    'holiday_promotion',
    'new_product_launch',
    'flash_sale',
    'seasonal_campaign',
    'brand_awareness',
    'lead_generation',
    'event_marketing',
    'influencer_collaboration',
    'referral_program',
    'newsletter',
    'other',
  ])
  scenario?: CampaignScenario;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };

  @ApiPropertyOptional({ type: CampaignGoalsDto })
  @IsOptional()
  @Type(() => CampaignGoalsDto)
  defaultGoals?: CampaignGoalsDto;

  @ApiPropertyOptional({ type: CampaignSettingsDto })
  @IsOptional()
  @Type(() => CampaignSettingsDto)
  settings?: CampaignSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCampaignTemplateDto extends PartialType(CreateCampaignTemplateDto) {}

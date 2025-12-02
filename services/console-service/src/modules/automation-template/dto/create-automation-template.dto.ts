import { IsString, IsOptional, IsArray, IsObject, MaxLength, MinLength, ValidateNested, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TriggerConfigDto {
  @ApiProperty({ description: '触发器类型', enum: ['event', 'schedule', 'manual', 'webhook'] })
  @IsEnum(['event', 'schedule', 'manual', 'webhook'])
  type: 'event' | 'schedule' | 'manual' | 'webhook';

  @ApiProperty({ description: '触发器配置' })
  @IsObject()
  config: Record<string, any>;
}

export class ActionConditionDto {
  @ApiProperty({ description: '字段名' })
  @IsString()
  field: string;

  @ApiProperty({ description: '操作符', enum: ['eq', 'ne', 'gt', 'lt', 'contains', 'startsWith', 'endsWith'] })
  @IsEnum(['eq', 'ne', 'gt', 'lt', 'contains', 'startsWith', 'endsWith'])
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'startsWith' | 'endsWith';

  @ApiProperty({ description: '值' })
  value: any;
}

export class ActionDto {
  @ApiProperty({
    description: '动作类型',
    enum: ['send_email', 'send_slack', 'send_webhook', 'update_link', 'create_alert', 'run_script']
  })
  @IsEnum(['send_email', 'send_slack', 'send_webhook', 'update_link', 'create_alert', 'run_script'])
  type: 'send_email' | 'send_slack' | 'send_webhook' | 'update_link' | 'create_alert' | 'run_script';

  @ApiPropertyOptional({ description: '动作名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '动作配置' })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({ description: '条件执行' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionConditionDto)
  condition?: ActionConditionDto;
}

export class ConditionDto {
  @ApiProperty({ description: '字段名' })
  @IsString()
  field: string;

  @ApiProperty({ description: '操作符', enum: ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'in', 'notIn'] })
  @IsEnum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'in', 'notIn'])
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in' | 'notIn';

  @ApiProperty({ description: '值' })
  value: any;

  @ApiPropertyOptional({ description: '逻辑运算符', enum: ['AND', 'OR'] })
  @IsOptional()
  @IsEnum(['AND', 'OR'])
  logic?: 'AND' | 'OR';
}

export class CreateAutomationTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '模板描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: '图标' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '颜色' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: '分类',
    enum: ['notification', 'moderation', 'analytics', 'integration', 'custom'],
    default: 'custom'
  })
  @IsOptional()
  @IsEnum(['notification', 'moderation', 'analytics', 'integration', 'custom'])
  category?: 'notification' | 'moderation' | 'analytics' | 'integration' | 'custom';

  @ApiProperty({ description: '触发器配置' })
  @ValidateNested()
  @Type(() => TriggerConfigDto)
  trigger: TriggerConfigDto;

  @ApiProperty({ description: '动作列表', type: [ActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions: ActionDto[];

  @ApiPropertyOptional({ description: '全局条件', type: [ConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions?: ConditionDto[];

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

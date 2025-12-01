import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsObject, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TriggerType } from '../entities/automation-workflow.entity';

class TriggerDto {
  @IsEnum(['event', 'schedule', 'manual', 'webhook'])
  type: TriggerType;

  @IsObject()
  config: Record<string, any>;
}

class ActionDto {
  @IsString()
  type: string;

  @IsObject()
  config: Record<string, any>;
}

class ConditionDto {
  @IsString()
  field: string;

  @IsString()
  operator: string;

  value: any;
}

export class CreateAutomationWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  @Type(() => TriggerDto)
  trigger: TriggerDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions: ActionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions?: ConditionDto[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

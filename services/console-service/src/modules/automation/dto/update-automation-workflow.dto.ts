import { PartialType } from '@nestjs/mapped-types';
import { CreateAutomationWorkflowDto } from './create-automation-workflow.dto';

export class UpdateAutomationWorkflowDto extends PartialType(CreateAutomationWorkflowDto) {}

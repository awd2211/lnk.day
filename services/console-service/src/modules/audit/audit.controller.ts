import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto, ExportAuditLogsDto } from './dto/query-audit-logs.dto';
import { AuditAction, ActorType } from './entities/audit-log.entity';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取审计统计数据' })
  @ApiResponse({ status: HttpStatus.OK, description: '返回审计统计数据' })
  async getStats() {
    return this.auditService.getStats();
  }

  @Get('logs')
  @ApiOperation({ summary: '获取审计日志列表' })
  @ApiResponse({ status: HttpStatus.OK, description: '返回审计日志列表' })
  async getLogs(@Query() query: QueryAuditLogsDto) {
    return this.auditService.findAll(query);
  }

  @Get('logs/:id')
  @ApiOperation({ summary: '获取审计日志详情' })
  @ApiResponse({ status: HttpStatus.OK, description: '返回审计日志详情' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '日志不存在' })
  async getLogById(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }

  @Post('export')
  @ApiOperation({ summary: '导出审计日志' })
  @ApiResponse({ status: HttpStatus.OK, description: '返回导出文件' })
  async exportLogs(@Body() query: ExportAuditLogsDto, @Res() res: Response) {
    const { data, contentType, filename } = await this.auditService.export(query);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }

  @Get('action-types')
  @ApiOperation({ summary: '获取所有操作类型' })
  @ApiResponse({ status: HttpStatus.OK, description: '返回操作类型列表' })
  async getActionTypes() {
    return {
      actions: this.auditService.getActionTypes(),
    };
  }

  @Get('actor-types')
  @ApiOperation({ summary: '获取所有操作者类型' })
  @ApiResponse({ status: HttpStatus.OK, description: '返回操作者类型列表' })
  async getActorTypes() {
    return {
      actorTypes: this.auditService.getActorTypes(),
    };
  }
}

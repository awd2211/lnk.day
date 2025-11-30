/// <reference types="multer" />
import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

import { BatchService } from './batch.service';
import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
} from '@lnk/nestjs-common';
import { ImportLinksDto, ImportResultDto } from './dto/import-links.dto';
import { ExportLinksQueryDto } from './dto/export-links.dto';
import {
  BatchUpdateDto,
  BatchDeleteDto,
  BatchArchiveDto,
  BatchRestoreDto,
  BatchMoveToFolderDto,
  BatchOperationResultDto,
  BulkSelectQueryDto,
} from './dto/batch-edit.dto';

@ApiTags('batch')
@Controller('links/batch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post('import')
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '批量导入链接 (JSON)' })
  @ApiResponse({ status: 201, type: ImportResultDto })
  async importLinks(
    @Body() dto: ImportLinksDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ): Promise<ImportResultDto> {
    return this.batchService.importLinks(dto, user.id, teamId);
  }

  @Post('import/csv')
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '从 CSV 文件批量导入链接' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV 文件',
        },
        skipDuplicates: {
          type: 'boolean',
          description: '跳过重复项',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importFromCsv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
    @Body('skipDuplicates') skipDuplicates?: string,
  ): Promise<ImportResultDto> {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV');
    }

    const csvContent = file.buffer.toString('utf-8');
    const skip = skipDuplicates === 'true';

    return this.batchService.importFromCsv(csvContent, user.id, teamId, skip);
  }

  @Get('export')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '导出链接为 CSV 或 JSON' })
  async exportLinks(
    @Query() query: ExportLinksQueryDto,
    @ScopedTeamId() teamId: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.batchService.exportLinks(teamId, query);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  }

  @Get('template')
  @ApiOperation({ summary: '获取 CSV 导入模板' })
  async getCsvTemplate(@Res() res: Response): Promise<void> {
    const template = this.batchService.getCsvTemplate();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="import-template.csv"');
    res.send(template);
  }

  // ========== 批量编辑操作 ==========

  @Post('update')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '批量更新链接（标签、文件夹、状态等）' })
  @ApiResponse({ status: 200, type: BatchOperationResultDto })
  async batchUpdate(
    @Body() dto: BatchUpdateDto,
    @ScopedTeamId() teamId: string,
  ): Promise<BatchOperationResultDto> {
    return this.batchService.batchUpdate(dto, teamId);
  }

  @Post('delete')
  @RequirePermissions(Permission.LINKS_DELETE)
  @ApiOperation({ summary: '批量删除链接' })
  @ApiResponse({ status: 200, type: BatchOperationResultDto })
  async batchDelete(
    @Body() dto: BatchDeleteDto,
    @ScopedTeamId() teamId: string,
  ): Promise<BatchOperationResultDto> {
    return this.batchService.batchDelete(dto, teamId);
  }

  @Post('archive')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '批量归档链接' })
  @ApiResponse({ status: 200, type: BatchOperationResultDto })
  async batchArchive(
    @Body() dto: BatchArchiveDto,
    @ScopedTeamId() teamId: string,
  ): Promise<BatchOperationResultDto> {
    return this.batchService.batchArchive(dto, teamId);
  }

  @Post('restore')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '批量恢复已归档/删除的链接' })
  @ApiResponse({ status: 200, type: BatchOperationResultDto })
  async batchRestore(
    @Body() dto: BatchRestoreDto,
    @ScopedTeamId() teamId: string,
  ): Promise<BatchOperationResultDto> {
    return this.batchService.batchRestore(dto, teamId);
  }

  @Post('move')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '批量移动链接到文件夹' })
  @ApiResponse({ status: 200, type: BatchOperationResultDto })
  async batchMoveToFolder(
    @Body() dto: BatchMoveToFolderDto,
    @ScopedTeamId() teamId: string,
  ): Promise<BatchOperationResultDto> {
    return this.batchService.batchMoveToFolder(dto, teamId);
  }

  @Get('select')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '根据条件批量选择链接ID（用于后续批量操作）' })
  async bulkSelectIds(
    @Query() query: BulkSelectQueryDto,
    @ScopedTeamId() teamId: string,
  ): Promise<{ ids: string[]; total: number }> {
    return this.batchService.bulkSelectIds(query, teamId);
  }

  @Post('tags/add')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '批量添加标签' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        linkIds: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async batchAddTags(
    @Body('linkIds') linkIds: string[],
    @Body('tags') tags: string[],
    @ScopedTeamId() teamId: string,
  ): Promise<BatchOperationResultDto> {
    return this.batchService.batchAddTags(linkIds, tags, teamId);
  }

  @Post('tags/remove')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '批量移除标签' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        linkIds: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async batchRemoveTags(
    @Body('linkIds') linkIds: string[],
    @Body('tags') tags: string[],
    @ScopedTeamId() teamId: string,
  ): Promise<BatchOperationResultDto> {
    return this.batchService.batchRemoveTags(linkIds, tags, teamId);
  }
}

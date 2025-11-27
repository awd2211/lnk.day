import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportLinksDto, ImportResultDto } from './dto/import-links.dto';
import { ExportLinksQueryDto } from './dto/export-links.dto';

@ApiTags('batch')
@Controller('links/batch')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post('import')
  @ApiOperation({ summary: '批量导入链接 (JSON)' })
  @ApiResponse({ status: 201, type: ImportResultDto })
  async importLinks(
    @Body() dto: ImportLinksDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
  ): Promise<ImportResultDto> {
    return this.batchService.importLinks(dto, userId, teamId || userId);
  }

  @Post('import/csv')
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
    @Headers('x-user-id') userId: string,
    @Headers('x-team-id') teamId: string,
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

    return this.batchService.importFromCsv(csvContent, userId, teamId || userId, skip);
  }

  @Get('export')
  @ApiOperation({ summary: '导出链接为 CSV 或 JSON' })
  async exportLinks(
    @Query() query: ExportLinksQueryDto,
    @Headers('x-team-id') teamId: string,
    @Headers('x-user-id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.batchService.exportLinks(teamId || userId, query);

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
}

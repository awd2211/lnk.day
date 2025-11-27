import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { PreviewService } from './preview.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FetchPreviewDto, UpdatePreviewDto } from './dto/preview.dto';

@ApiTags('previews')
@Controller('previews')
export class PreviewController {
  constructor(private readonly previewService: PreviewService) {}

  @Post('fetch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '抓取 URL 预览信息' })
  fetchPreview(@Body() dto: FetchPreviewDto) {
    return this.previewService.fetchPreview(dto.url, undefined, dto.forceRefresh);
  }

  @Get('url')
  @ApiOperation({ summary: '获取 URL 预览信息（公开接口）' })
  @ApiQuery({ name: 'url', description: 'URL to get preview for' })
  @ApiQuery({ name: 'refresh', required: false, type: Boolean })
  getUrlPreview(
    @Query('url') url: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.previewService.fetchPreview(url, undefined, refresh === 'true');
  }

  @Get('link/:linkId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取链接的预览信息' })
  getLinkPreview(@Param('linkId') linkId: string) {
    return this.previewService.getPreview(linkId);
  }

  @Post('link/:linkId/fetch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '抓取并保存链接的预览信息' })
  fetchLinkPreview(
    @Param('linkId') linkId: string,
    @Body() dto: FetchPreviewDto,
  ) {
    return this.previewService.fetchPreview(dto.url, linkId, dto.forceRefresh);
  }

  @Put('link/:linkId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新链接的预览信息' })
  updateLinkPreview(
    @Param('linkId') linkId: string,
    @Body() dto: UpdatePreviewDto,
  ) {
    return this.previewService.updatePreview(linkId, dto);
  }

  @Delete('link/:linkId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除链接的预览信息' })
  async deleteLinkPreview(@Param('linkId') linkId: string) {
    await this.previewService.deletePreview(linkId);
    return { message: 'Preview deleted successfully' };
  }
}

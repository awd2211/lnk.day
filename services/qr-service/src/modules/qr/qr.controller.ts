import { Controller, Post, Body, Res, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { QrService, QrOptions } from './qr.service';

class GenerateQrDto {
  url: string;
  options?: QrOptions;
}

class BatchGenerateDto {
  urls: Array<{ url: string; filename?: string }>;
  options?: QrOptions;
}

@ApiTags('qr')
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Post('generate')
  @ApiOperation({ summary: '生成二维码' })
  @ApiBody({ type: GenerateQrDto })
  async generate(@Body() body: GenerateQrDto, @Res() res: Response) {
    const { url, options = {} } = body;
    const format = options.format || 'png';

    if (format === 'svg') {
      const svg = await this.qrService.generate(url, options);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(svg);
    }

    const buffer = await this.qrService.generate(url, options);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  @Get('generate')
  @ApiOperation({ summary: '生成二维码 (GET)' })
  @ApiQuery({ name: 'url', required: true, description: '要编码的URL' })
  @ApiQuery({ name: 'size', required: false, description: '二维码尺寸 (默认300)' })
  @ApiQuery({ name: 'format', required: false, enum: ['png', 'svg'], description: '输出格式' })
  @ApiQuery({ name: 'fg', required: false, description: '前景色 (十六进制)' })
  @ApiQuery({ name: 'bg', required: false, description: '背景色 (十六进制)' })
  async generateGet(
    @Query('url') url: string,
    @Query('size') size?: string,
    @Query('format') format?: 'png' | 'svg',
    @Query('fg') foregroundColor?: string,
    @Query('bg') backgroundColor?: string,
    @Res() res?: Response,
  ) {
    const options: QrOptions = {
      size: size ? parseInt(size) : 300,
      format: format || 'png',
      foregroundColor: foregroundColor ? `#${foregroundColor}` : '#000000',
      backgroundColor: backgroundColor ? `#${backgroundColor}` : '#ffffff',
    };

    if (format === 'svg') {
      const svg = await this.qrService.generate(url, options);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(svg);
    }

    const buffer = await this.qrService.generate(url, options);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  @Post('dataurl')
  @ApiOperation({ summary: '生成二维码 DataURL' })
  async generateDataUrl(@Body() body: GenerateQrDto) {
    const dataUrl = await this.qrService.generateDataUrl(body.url, body.options);
    return { dataUrl };
  }

  @Get('styles')
  @ApiOperation({ summary: '获取可用样式列表' })
  getStyles() {
    return this.qrService.getAvailableStyles();
  }

  @Get('style/:styleId')
  @ApiOperation({ summary: '使用预设样式生成二维码' })
  @ApiQuery({ name: 'url', required: true })
  @ApiQuery({ name: 'size', required: false })
  async generateWithStyle(
    @Query('url') url: string,
    @Query('styleId') styleId: string,
    @Query('size') size?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.qrService.generateWithStyle(url, styleId, size ? parseInt(size) : 300);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量生成二维码' })
  @ApiBody({ type: BatchGenerateDto })
  async generateBatch(@Body() body: BatchGenerateDto) {
    const results = await this.qrService.generateBatch(body.urls, body.options);
    return { count: results.length, results };
  }

  @Post('link/:linkId')
  @ApiOperation({ summary: '为链接生成二维码' })
  async generateForLink(
    @Body() body: { shortUrl: string; linkId: string; options?: QrOptions },
    @Res() res: Response,
  ) {
    const { buffer, metadata } = await this.qrService.generateForLink(
      body.shortUrl,
      body.linkId,
      body.options,
    );

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('X-QR-Metadata', JSON.stringify(metadata));
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  @Post('logo')
  @ApiOperation({ summary: '生成带Logo的二维码' })
  async generateWithLogo(
    @Body()
    body: {
      url: string;
      logoUrl: string;
      size?: number;
      logoSize?: number;
    },
    @Res() res: Response,
  ) {
    const buffer = await this.qrService.generate(body.url, {
      size: body.size || 400,
      logoUrl: body.logoUrl,
      logoSize: body.logoSize || 20,
      errorCorrectionLevel: 'H',
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }
}

import { Controller, Post, Body, Res, Get, Query, Param, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiProperty, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { QrService, QrOptions, GradientConfig, EyeStyle, TextLabelConfig } from './qr.service';

class GradientConfigDto implements GradientConfig {
  @ApiProperty() enabled: boolean;
  @ApiProperty() startColor: string;
  @ApiProperty() endColor: string;
  @ApiProperty({ enum: ['horizontal', 'vertical', 'diagonal'] })
  direction: 'horizontal' | 'vertical' | 'diagonal';
}

class EyeStyleDto implements EyeStyle {
  @ApiProperty({ enum: ['square', 'rounded', 'circle', 'diamond'] })
  outer: 'square' | 'rounded' | 'circle' | 'diamond';
  @ApiProperty({ enum: ['square', 'rounded', 'circle', 'dot'] })
  inner: 'square' | 'rounded' | 'circle' | 'dot';
  @ApiProperty({ required: false }) color?: string;
}

class TextLabelDto {
  @ApiProperty() enabled: boolean;
  @ApiProperty() text: string;
  @ApiProperty({ required: false }) fontSize?: number;
  @ApiProperty({ required: false }) fontFamily?: string;
  @ApiProperty({ required: false }) color?: string;
  @ApiProperty({ required: false, enum: ['bottom', 'top'] }) position?: 'bottom' | 'top';
  @ApiProperty({ required: false }) padding?: number;
  @ApiProperty({ required: false }) backgroundColor?: string;
}

class QrOptionsDto implements QrOptions {
  @ApiProperty({ required: false }) size?: number;
  @ApiProperty({ required: false }) foregroundColor?: string;
  @ApiProperty({ required: false }) backgroundColor?: string;
  @ApiProperty({ required: false, enum: ['png', 'svg', 'pdf', 'eps'] })
  format?: 'png' | 'svg' | 'pdf' | 'eps';
  @ApiProperty({ required: false }) logoUrl?: string;
  @ApiProperty({ required: false }) logoSize?: number;
  @ApiProperty({ required: false }) margin?: number;
  @ApiProperty({ required: false, enum: ['L', 'M', 'Q', 'H'] })
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  @ApiProperty({ required: false, enum: [72, 150, 300, 600, 1200] })
  dpi?: 72 | 150 | 300 | 600 | 1200;
  @ApiProperty({ required: false, type: GradientConfigDto })
  gradient?: GradientConfig;
  @ApiProperty({ required: false, type: EyeStyleDto })
  eyeStyle?: EyeStyle;
  @ApiProperty({ required: false, type: TextLabelDto, description: '文字标签配置' })
  textLabel?: TextLabelDto;
}

class GenerateQrDto {
  @ApiProperty() url: string;
  @ApiProperty({ required: false, type: QrOptionsDto }) options?: QrOptions;
}

class BatchGenerateDto {
  @ApiProperty() urls: Array<{ url: string; filename?: string }>;
  @ApiProperty({ required: false, type: QrOptionsDto }) options?: QrOptions;
}

import { QrLimitService } from './qr-limit.service';

@ApiTags('qr')
@Controller('qr')
export class QrController {
  constructor(
    private readonly qrService: QrService,
    private readonly qrLimitService: QrLimitService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: '生成二维码 (支持 PNG/SVG/PDF/EPS 格式)' })
  @ApiBody({ type: GenerateQrDto })
  async generate(@Body() body: GenerateQrDto, @Res() res: Response) {
    const { url, options = {} } = body;
    const format = options.format || 'png';

    const result = await this.qrService.generate(url, options);

    switch (format) {
      case 'svg':
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', 'attachment; filename=qrcode.svg');
        break;
      case 'pdf':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=qrcode.pdf');
        break;
      case 'eps':
        res.setHeader('Content-Type', 'application/postscript');
        res.setHeader('Content-Disposition', 'attachment; filename=qrcode.eps');
        break;
      default:
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'inline; filename=qrcode.png');
        break;
    }

    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(result);
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

  @Post('with-text')
  @ApiOperation({ summary: '生成带文字标签的二维码' })
  async generateWithText(
    @Body()
    body: {
      url: string;
      text: string;
      options?: QrOptions;
    },
    @Res() res: Response,
  ) {
    const buffer = await this.qrService.generate(body.url, {
      ...body.options,
      textLabel: {
        enabled: true,
        text: body.text,
        position: 'bottom',
      },
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  @Post('with-multiline-text')
  @ApiOperation({ summary: '生成带多行文字的二维码' })
  async generateWithMultiLineText(
    @Body()
    body: {
      url: string;
      lines: string[];
      options?: QrOptions;
    },
    @Res() res: Response,
  ) {
    const buffer = await this.qrService.generateWithMultiLineText(
      body.url,
      body.lines,
      body.options,
    );

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  // ============ QR 限制 API ============

  @Post('limits')
  @ApiOperation({ summary: '创建 QR 扫码限制配置' })
  async createLimit(
    @Body()
    body: {
      qrId: string;
      teamId: string;
      maxScans?: number;
      dailyLimit?: number;
      allowedCountries?: string[];
      blockedCountries?: string[];
      validFrom?: string;
      validUntil?: string;
      limitAction?: 'block' | 'redirect' | 'warn';
      limitRedirectUrl?: string;
      limitMessage?: string;
    },
  ) {
    const limit = await this.qrLimitService.create({
      qrId: body.qrId,
      teamId: body.teamId,
      maxScans: body.maxScans,
      dailyLimit: body.dailyLimit,
      allowedCountries: body.allowedCountries,
      blockedCountries: body.blockedCountries,
      validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      limitAction: body.limitAction,
      limitRedirectUrl: body.limitRedirectUrl,
      limitMessage: body.limitMessage,
    });
    return limit;
  }

  @Get('limits/:qrId')
  @ApiOperation({ summary: '获取 QR 扫码限制配置' })
  async getLimit(@Query('qrId') qrId: string) {
    const limit = await this.qrLimitService.findByQrId(qrId);
    return limit || { message: 'No limit configured for this QR' };
  }

  @Get('limits/:qrId/stats')
  @ApiOperation({ summary: '获取 QR 扫码统计' })
  async getLimitStats(@Query('qrId') qrId: string) {
    const stats = await this.qrLimitService.getStats(qrId);
    return stats || { message: 'No stats available' };
  }

  @Post('limits/:qrId/check')
  @ApiOperation({ summary: '检查是否允许扫码' })
  async checkLimit(
    @Query('qrId') qrId: string,
    @Body() body: { country?: string },
  ) {
    return this.qrLimitService.checkLimit(qrId, body.country);
  }

  @Post('limits/:qrId/reset')
  @ApiOperation({ summary: '重置扫码计数' })
  async resetLimit(
    @Query('qrId') qrId: string,
    @Body() body: { type?: 'all' | 'daily' },
  ) {
    await this.qrLimitService.resetScans(qrId, body.type || 'all');
    return { success: true, qrId };
  }

  @Post('limits/:qrId/record')
  @ApiOperation({ summary: '记录一次扫码' })
  async recordScan(@Query('qrId') qrId: string) {
    await this.qrLimitService.recordScan(qrId);
    return { success: true };
  }
}

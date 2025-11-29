import { Controller, Post, Body, Res, Get, Query, Param, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiProperty, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response } from 'express';
import { QrService, QrOptions, GradientConfig, EyeStyle, TextLabelConfig } from './qr.service';
import {
  QRContentType,
  QRContentEncoder,
  PhoneContent,
  SMSContent,
  EmailContent,
  WiFiContent,
  VCardContent,
  CalendarContent,
  GeoContent,
} from './qr-content.types';

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

// ========== 多类型内容 DTO ==========

class PhoneContentDto implements PhoneContent {
  @ApiProperty({ description: '电话号码' }) phone: string;
}

class SMSContentDto implements SMSContent {
  @ApiProperty({ description: '电话号码' }) phone: string;
  @ApiProperty({ required: false, description: '短信内容' }) message?: string;
}

class EmailContentDto implements EmailContent {
  @ApiProperty({ description: '收件人邮箱' }) to: string;
  @ApiProperty({ required: false, description: '邮件主题' }) subject?: string;
  @ApiProperty({ required: false, description: '邮件正文' }) body?: string;
  @ApiProperty({ required: false, description: '抄送' }) cc?: string;
  @ApiProperty({ required: false, description: '密送' }) bcc?: string;
}

class WiFiContentDto implements WiFiContent {
  @ApiProperty({ description: 'WiFi 名称' }) ssid: string;
  @ApiProperty({ required: false, description: 'WiFi 密码' }) password?: string;
  @ApiProperty({ enum: ['WPA', 'WEP', 'nopass'], description: '加密类型' })
  encryption: 'WPA' | 'WEP' | 'nopass';
  @ApiProperty({ required: false, description: '是否隐藏网络' }) hidden?: boolean;
}

class VCardContentDto implements VCardContent {
  @ApiProperty({ description: '名' }) firstName: string;
  @ApiProperty({ required: false, description: '姓' }) lastName?: string;
  @ApiProperty({ required: false, description: '公司/组织' }) organization?: string;
  @ApiProperty({ required: false, description: '职位' }) title?: string;
  @ApiProperty({ required: false, description: '工作电话' }) phone?: string;
  @ApiProperty({ required: false, description: '手机' }) mobile?: string;
  @ApiProperty({ required: false, description: '传真' }) fax?: string;
  @ApiProperty({ required: false, description: '邮箱' }) email?: string;
  @ApiProperty({ required: false, description: '网站' }) website?: string;
  @ApiProperty({ required: false, description: '街道地址' }) street?: string;
  @ApiProperty({ required: false, description: '城市' }) city?: string;
  @ApiProperty({ required: false, description: '省/州' }) state?: string;
  @ApiProperty({ required: false, description: '邮编' }) zip?: string;
  @ApiProperty({ required: false, description: '国家' }) country?: string;
  @ApiProperty({ required: false, description: '备注' }) note?: string;
}

class CalendarContentDto implements CalendarContent {
  @ApiProperty({ description: '事件标题' }) title: string;
  @ApiProperty({ required: false, description: '事件描述' }) description?: string;
  @ApiProperty({ required: false, description: '地点' }) location?: string;
  @ApiProperty({ description: '开始时间 (ISO 8601)' }) startTime: string;
  @ApiProperty({ description: '结束时间 (ISO 8601)' }) endTime: string;
  @ApiProperty({ required: false, description: '全天事件' }) allDay?: boolean;
}

class GeoContentDto implements GeoContent {
  @ApiProperty({ description: '纬度' }) latitude: number;
  @ApiProperty({ description: '经度' }) longitude: number;
  @ApiProperty({ required: false, description: '地点名称' }) query?: string;
}

class GenerateTypedQrDto {
  @ApiProperty({ enum: QRContentType, description: '内容类型' })
  contentType: QRContentType;

  @ApiProperty({
    description: '内容数据，根据 contentType 不同有不同结构',
    oneOf: [
      { type: 'object', properties: { url: { type: 'string' } } },
      { $ref: '#/components/schemas/PhoneContentDto' },
      { $ref: '#/components/schemas/SMSContentDto' },
      { $ref: '#/components/schemas/EmailContentDto' },
      { $ref: '#/components/schemas/WiFiContentDto' },
      { $ref: '#/components/schemas/VCardContentDto' },
      { $ref: '#/components/schemas/CalendarContentDto' },
      { $ref: '#/components/schemas/GeoContentDto' },
    ],
  })
  content: any;

  @ApiProperty({ required: false, type: QrOptionsDto })
  options?: QrOptions;
}

import { QrLimitService } from './qr-limit.service';

@ApiTags('qr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
    @Res() res: Response,
    @Query('size') size?: string,
    @Query('format') format?: 'png' | 'svg',
    @Query('fg') foregroundColor?: string,
    @Query('bg') backgroundColor?: string,
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
    @Res() res: Response,
    @Query('size') size?: string,
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

  // ============ 多类型内容 API ============

  @Post('generate/typed')
  @ApiOperation({ summary: '生成多类型内容二维码 (URL/电话/短信/邮件/WiFi/vCard/日历/地理位置)' })
  @ApiBody({ type: GenerateTypedQrDto })
  async generateTyped(@Body() body: GenerateTypedQrDto, @Res() res: Response) {
    const { contentType, content, options = {} } = body;
    const format = options.format || 'png';

    // 编码内容
    const encodedContent = QRContentEncoder.encode({
      type: contentType,
      data: content,
    } as any);

    const result = await this.qrService.generate(encodedContent, options);

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
    res.setHeader('X-QR-Content-Type', contentType);
    return res.send(result);
  }

  @Post('generate/phone')
  @ApiOperation({ summary: '生成电话二维码' })
  @ApiBody({ type: PhoneContentDto })
  async generatePhone(
    @Body() body: PhoneContentDto & { options?: QrOptions },
    @Res() res: Response,
  ) {
    const content = QRContentEncoder.encode({
      type: QRContentType.PHONE,
      data: { phone: body.phone },
    });
    const buffer = await this.qrService.generate(content, body.options);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  @Post('generate/sms')
  @ApiOperation({ summary: '生成短信二维码' })
  @ApiBody({ type: SMSContentDto })
  async generateSMS(
    @Body() body: SMSContentDto & { options?: QrOptions },
    @Res() res: Response,
  ) {
    const content = QRContentEncoder.encode({
      type: QRContentType.SMS,
      data: { phone: body.phone, message: body.message },
    });
    const buffer = await this.qrService.generate(content, body.options);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  @Post('generate/email')
  @ApiOperation({ summary: '生成邮件二维码' })
  @ApiBody({ type: EmailContentDto })
  async generateEmail(
    @Body() body: EmailContentDto & { options?: QrOptions },
    @Res() res: Response,
  ) {
    const content = QRContentEncoder.encode({
      type: QRContentType.EMAIL,
      data: body,
    });
    const buffer = await this.qrService.generate(content, body.options);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  @Post('generate/wifi')
  @ApiOperation({ summary: '生成 WiFi 二维码' })
  @ApiBody({ type: WiFiContentDto })
  async generateWiFi(
    @Body() body: WiFiContentDto & { options?: QrOptions },
    @Res() res: Response,
  ) {
    const content = QRContentEncoder.encode({
      type: QRContentType.WIFI,
      data: body,
    });
    const buffer = await this.qrService.generate(content, body.options);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  @Post('generate/vcard')
  @ApiOperation({ summary: '生成电子名片二维码' })
  @ApiBody({ type: VCardContentDto })
  async generateVCard(
    @Body() body: VCardContentDto & { options?: QrOptions },
    @Res() res: Response,
  ) {
    const content = QRContentEncoder.encode({
      type: QRContentType.VCARD,
      data: body,
    });
    const buffer = await this.qrService.generate(content, body.options);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  @Post('export/vcard')
  @ApiOperation({ summary: '导出 vCard 文件 (.vcf)' })
  @ApiBody({ type: VCardContentDto })
  async exportVCard(
    @Body() body: VCardContentDto & { filename?: string },
    @Res() res: Response,
  ) {
    const vcardContent = QRContentEncoder.encode({
      type: QRContentType.VCARD,
      data: body,
    });

    const filename = body.filename ||
      `${body.firstName}${body.lastName ? '_' + body.lastName : ''}.vcf`;

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    return res.send(vcardContent);
  }

  @Post('export/calendar')
  @ApiOperation({ summary: '导出日历文件 (.ics)' })
  @ApiBody({ type: CalendarContentDto })
  async exportCalendar(
    @Body() body: CalendarContentDto & { filename?: string },
    @Res() res: Response,
  ) {
    // 生成完整的 iCalendar 格式
    const icsContent = this.generateICS(body);

    const filename = body.filename ||
      `${body.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.ics`;

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    return res.send(icsContent);
  }

  private generateICS(data: CalendarContent): string {
    const formatDate = (dateStr: string, allDay?: boolean) => {
      const date = new Date(dateStr);
      if (allDay) {
        return date.toISOString().slice(0, 10).replace(/-/g, '');
      }
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@lnk.day`;
    const now = formatDate(new Date().toISOString());

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//lnk.day//QR Service//CN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
    ];

    if (data.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDate(data.startTime, true)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDate(data.endTime, true)}`);
    } else {
      lines.push(`DTSTART:${formatDate(data.startTime)}`);
      lines.push(`DTEND:${formatDate(data.endTime)}`);
    }

    lines.push(`SUMMARY:${data.title}`);
    if (data.description) lines.push(`DESCRIPTION:${data.description.replace(/\n/g, '\\n')}`);
    if (data.location) lines.push(`LOCATION:${data.location}`);

    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }

  @Post('generate/calendar')
  @ApiOperation({ summary: '生成日历事件二维码' })
  @ApiBody({ type: CalendarContentDto })
  async generateCalendar(
    @Body() body: CalendarContentDto & { options?: QrOptions },
    @Res() res: Response,
  ) {
    const content = QRContentEncoder.encode({
      type: QRContentType.CALENDAR,
      data: body,
    });
    const buffer = await this.qrService.generate(content, body.options);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  @Post('generate/geo')
  @ApiOperation({ summary: '生成地理位置二维码' })
  @ApiBody({ type: GeoContentDto })
  async generateGeo(
    @Body() body: GeoContentDto & { options?: QrOptions },
    @Res() res: Response,
  ) {
    const content = QRContentEncoder.encode({
      type: QRContentType.GEO,
      data: body,
    });
    const buffer = await this.qrService.generate(content, body.options);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  @Get('content-types')
  @ApiOperation({ summary: '获取支持的内容类型列表' })
  getContentTypes() {
    return {
      types: Object.values(QRContentType),
      descriptions: {
        [QRContentType.URL]: 'URL 链接',
        [QRContentType.PHONE]: '电话号码 - 扫码后拨打电话',
        [QRContentType.SMS]: '短信 - 扫码后发送短信',
        [QRContentType.EMAIL]: '邮件 - 扫码后发送邮件',
        [QRContentType.WIFI]: 'WiFi - 扫码后连接 WiFi',
        [QRContentType.VCARD]: '电子名片 - 扫码后添加联系人',
        [QRContentType.CALENDAR]: '日历事件 - 扫码后添加日程',
        [QRContentType.GEO]: '地理位置 - 扫码后打开地图',
        [QRContentType.TEXT]: '纯文本',
      },
    };
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

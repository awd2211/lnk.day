import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import { createCanvas } from 'canvas';
import type { CanvasGradient as CanvasGradientType } from 'canvas';

export interface GradientConfig {
  enabled: boolean;
  startColor: string;
  endColor: string;
  direction: 'horizontal' | 'vertical' | 'diagonal';
}

export interface EyeStyle {
  outer: 'square' | 'rounded' | 'circle' | 'diamond';
  inner: 'square' | 'rounded' | 'circle' | 'dot';
  color?: string;
}

export interface TextLabelConfig {
  enabled: boolean;
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  position?: 'bottom' | 'top';
  padding?: number;
  backgroundColor?: string;
}

export interface QrOptions {
  size?: number;
  foregroundColor?: string;
  backgroundColor?: string;
  format?: 'png' | 'svg' | 'pdf' | 'eps';
  logoUrl?: string;
  logoSize?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  // 新增选项
  dpi?: 72 | 150 | 300 | 600 | 1200;
  gradient?: GradientConfig;
  eyeStyle?: EyeStyle;
  // 文字标签
  textLabel?: TextLabelConfig;
}

export interface QrStyle {
  id: string;
  name: string;
  foregroundColor: string;
  backgroundColor: string;
  cornerRadius?: number;
  dotStyle?: 'square' | 'dots' | 'rounded';
}

const DEFAULT_STYLES: QrStyle[] = [
  { id: 'classic', name: 'Classic', foregroundColor: '#000000', backgroundColor: '#ffffff' },
  { id: 'dark', name: 'Dark Mode', foregroundColor: '#ffffff', backgroundColor: '#1a1a2e' },
  { id: 'ocean', name: 'Ocean', foregroundColor: '#0077b6', backgroundColor: '#caf0f8' },
  { id: 'sunset', name: 'Sunset', foregroundColor: '#f72585', backgroundColor: '#fef9ef' },
  { id: 'forest', name: 'Forest', foregroundColor: '#2d6a4f', backgroundColor: '#d8f3dc' },
];

@Injectable()
export class QrService {
  private readonly brandName: string;

  constructor(private readonly configService: ConfigService) {
    this.brandName = this.configService.get('BRAND_NAME', 'lnk.day');
  }

  async generate(url: string, options: QrOptions = {}): Promise<Buffer | string> {
    const {
      size = 300,
      foregroundColor = '#000000',
      backgroundColor = '#ffffff',
      format = 'png',
      margin = 2,
      errorCorrectionLevel = 'M',
      dpi = 72,
    } = options;

    // 根据 DPI 计算实际像素尺寸
    const scaleFactor = dpi / 72;
    const actualSize = Math.round(size * scaleFactor);

    const qrOptions = {
      width: actualSize,
      margin,
      errorCorrectionLevel,
      color: {
        dark: foregroundColor,
        light: backgroundColor,
      },
    };

    // SVG 格式
    if (format === 'svg') {
      return QRCode.toString(url, { type: 'svg', ...qrOptions });
    }

    // PDF 格式
    if (format === 'pdf') {
      return this.generatePdf(url, options);
    }

    // EPS 格式
    if (format === 'eps') {
      return this.generateEps(url, options);
    }

    // PNG 格式 (支持渐变和自定义眼睛样式)
    let qrBuffer: Buffer;

    if (options.gradient?.enabled || options.eyeStyle) {
      qrBuffer = await this.generateAdvancedQr(url, options);
    } else {
      qrBuffer = await QRCode.toBuffer(url, qrOptions);
    }

    // Add logo if provided
    if (options.logoUrl) {
      qrBuffer = await this.addLogo(qrBuffer, options.logoUrl, actualSize, options.logoSize);
    }

    // Add text label if provided
    if (options.textLabel?.enabled && options.textLabel.text) {
      qrBuffer = await this.addTextLabel(qrBuffer, actualSize, options.textLabel);
    }

    // 如果 DPI 不是 72，添加 DPI 元数据
    if (dpi !== 72) {
      qrBuffer = await sharp(qrBuffer)
        .withMetadata({ density: dpi })
        .png()
        .toBuffer();
    }

    return qrBuffer;
  }

  // 生成 PDF 格式二维码
  async generatePdf(url: string, options: QrOptions = {}): Promise<Buffer> {
    const { size = 300, dpi = 300 } = options;

    // 先生成 PNG
    const pngBuffer = await this.generate(url, { ...options, format: 'png', dpi }) as Buffer;

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: [size, size],
        margin: 0,
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.image(pngBuffer, 0, 0, { width: size, height: size });
      doc.end();
    });
  }

  // 生成 EPS 格式 (PostScript)
  async generateEps(url: string, options: QrOptions = {}): Promise<Buffer> {
    const { size = 300 } = options;

    // 生成 SVG 然后转换为 EPS
    const svg = await QRCode.toString(url, {
      type: 'svg',
      width: size,
      margin: options.margin || 2,
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      color: {
        dark: options.foregroundColor || '#000000',
        light: options.backgroundColor || '#ffffff',
      },
    });

    // 简化的 EPS 生成 (基于 SVG 路径)
    const eps = this.svgToEps(svg, size);
    return Buffer.from(eps, 'utf-8');
  }

  // SVG 转 EPS 辅助方法
  private svgToEps(svg: string, size: number): string {
    const eps = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 ${size} ${size}
%%HiResBoundingBox: 0 0 ${size}.000000 ${size}.000000
%%Creator: ${this.brandName} QR Service
%%Title: QR Code
%%EndComments
%%BeginProlog
%%EndProlog
%%BeginSetup
%%EndSetup
gsave
0 ${size} translate
1 -1 scale
${this.extractPathsFromSvg(svg)}
grestore
%%EOF`;
    return eps;
  }

  // 从 SVG 提取路径数据
  private extractPathsFromSvg(svg: string): string {
    // 提取 SVG 中的 rect 元素并转换为 PostScript
    const rectRegex = /<rect[^>]*x="([^"]*)"[^>]*y="([^"]*)"[^>]*width="([^"]*)"[^>]*height="([^"]*)"[^>]*fill="([^"]*)"/g;
    let match;
    let psCommands = '';

    while ((match = rectRegex.exec(svg)) !== null) {
      const [, x, y, width, height, fill] = match;
      if (fill !== '#ffffff' && fill !== 'white') {
        psCommands += `newpath ${x} ${y} moveto ${width} 0 rlineto 0 ${height} rlineto -${width} 0 rlineto closepath fill\n`;
      }
    }

    // 如果没有找到 rect，使用 path 元素
    if (!psCommands) {
      const pathRegex = /<path[^>]*d="([^"]*)"[^>]*fill="([^"]*)"/g;
      while ((match = pathRegex.exec(svg)) !== null) {
        const [, d, fill] = match;
        if (d && fill !== '#ffffff' && fill !== 'white') {
          psCommands += `0 0 0 setrgbcolor\nnewpath\n${this.svgPathToPs(d)}\nfill\n`;
        }
      }
    }

    return psCommands || '0 0 0 setrgbcolor\nnewpath 0 0 moveto 100 0 lineto 100 100 lineto 0 100 lineto closepath fill';
  }

  // SVG 路径转 PostScript
  private svgPathToPs(d: string): string {
    return d.replace(/M/g, ' moveto ').replace(/L/g, ' lineto ').replace(/H/g, ' 0 rlineto ').replace(/V/g, ' 0 exch rlineto ').replace(/Z/g, ' closepath ');
  }

  // 生成高级二维码 (支持渐变和自定义眼睛)
  async generateAdvancedQr(url: string, options: QrOptions): Promise<Buffer> {
    const {
      size = 300,
      foregroundColor = '#000000',
      backgroundColor = '#ffffff',
      margin = 2,
      errorCorrectionLevel = 'M',
      dpi = 72,
      gradient,
      eyeStyle,
    } = options;

    const scaleFactor = dpi / 72;
    const actualSize = Math.round(size * scaleFactor);

    // 生成 QR 矩阵
    const qrMatrix = await QRCode.create(url, { errorCorrectionLevel });
    const moduleCount = qrMatrix.modules.size;
    const moduleSize = (actualSize - margin * 2) / moduleCount;

    // 使用 canvas 绘制
    const canvas = createCanvas(actualSize, actualSize);
    const ctx = canvas.getContext('2d');

    // 绘制背景
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, actualSize, actualSize);

    // 创建渐变 (如果启用)
    let fillStyle: string | CanvasGradientType = foregroundColor;
    if (gradient?.enabled) {
      const grad = this.createGradient(ctx, gradient, actualSize);
      fillStyle = grad;
    }

    ctx.fillStyle = fillStyle;

    // 绘制模块
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qrMatrix.modules.get(row, col)) {
          const x = margin + col * moduleSize;
          const y = margin + row * moduleSize;

          // 检查是否是眼睛位置
          const isEye = this.isEyePosition(row, col, moduleCount);

          if (isEye && eyeStyle) {
            // 使用自定义眼睛样式
            if (eyeStyle.color) {
              ctx.fillStyle = eyeStyle.color;
            }
            this.drawEyeModule(ctx, x, y, moduleSize, row, col, moduleCount, eyeStyle);
            ctx.fillStyle = fillStyle; // 恢复
          } else {
            ctx.fillRect(x, y, moduleSize, moduleSize);
          }
        }
      }
    }

    return canvas.toBuffer('image/png');
  }

  // 创建渐变
  private createGradient(ctx: any, gradient: GradientConfig, size: number): CanvasGradientType {
    let grad: CanvasGradientType;

    switch (gradient.direction) {
      case 'horizontal':
        grad = ctx.createLinearGradient(0, 0, size, 0);
        break;
      case 'vertical':
        grad = ctx.createLinearGradient(0, 0, 0, size);
        break;
      case 'diagonal':
      default:
        grad = ctx.createLinearGradient(0, 0, size, size);
        break;
    }

    grad.addColorStop(0, gradient.startColor);
    grad.addColorStop(1, gradient.endColor);
    return grad;
  }

  // 检查是否是眼睛位置
  private isEyePosition(row: number, col: number, moduleCount: number): boolean {
    // 左上角眼睛
    if (row < 7 && col < 7) return true;
    // 右上角眼睛
    if (row < 7 && col >= moduleCount - 7) return true;
    // 左下角眼睛
    if (row >= moduleCount - 7 && col < 7) return true;
    return false;
  }

  // 绘制眼睛模块
  private drawEyeModule(
    ctx: any,
    x: number,
    y: number,
    moduleSize: number,
    row: number,
    col: number,
    moduleCount: number,
    eyeStyle: EyeStyle,
  ): void {
    // 确定是外圈还是内圈
    const isOuterRing = this.isOuterEyeRing(row, col, moduleCount);
    const style = isOuterRing ? eyeStyle.outer : eyeStyle.inner;

    switch (style) {
      case 'rounded':
        this.drawRoundedRect(ctx, x, y, moduleSize, moduleSize, moduleSize * 0.3);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(x + moduleSize / 2, y + moduleSize / 2, moduleSize / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(x + moduleSize / 2, y);
        ctx.lineTo(x + moduleSize, y + moduleSize / 2);
        ctx.lineTo(x + moduleSize / 2, y + moduleSize);
        ctx.lineTo(x, y + moduleSize / 2);
        ctx.closePath();
        ctx.fill();
        break;
      case 'dot':
        ctx.beginPath();
        ctx.arc(x + moduleSize / 2, y + moduleSize / 2, moduleSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'square':
      default:
        ctx.fillRect(x, y, moduleSize, moduleSize);
        break;
    }
  }

  // 检查是否是眼睛外圈
  private isOuterEyeRing(row: number, col: number, moduleCount: number): boolean {
    // 左上角
    if (row < 7 && col < 7) {
      return row === 0 || row === 6 || col === 0 || col === 6;
    }
    // 右上角
    if (row < 7 && col >= moduleCount - 7) {
      const localCol = col - (moduleCount - 7);
      return row === 0 || row === 6 || localCol === 0 || localCol === 6;
    }
    // 左下角
    if (row >= moduleCount - 7 && col < 7) {
      const localRow = row - (moduleCount - 7);
      return localRow === 0 || localRow === 6 || col === 0 || col === 6;
    }
    return false;
  }

  // 绘制圆角矩形
  private drawRoundedRect(ctx: any, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  async generateDataUrl(url: string, options: QrOptions = {}): Promise<string> {
    const {
      size = 300,
      foregroundColor = '#000000',
      backgroundColor = '#ffffff',
      errorCorrectionLevel = 'H',
    } = options;

    return QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      errorCorrectionLevel,
      color: {
        dark: foregroundColor,
        light: backgroundColor,
      },
    });
  }

  async generateWithStyle(url: string, styleId: string, size: number = 300): Promise<Buffer> {
    const style = DEFAULT_STYLES.find((s) => s.id === styleId) || DEFAULT_STYLES[0];
    const fg = style?.foregroundColor || '#000000';
    const bg = style?.backgroundColor || '#ffffff';

    return this.generate(url, {
      size,
      foregroundColor: fg,
      backgroundColor: bg,
      errorCorrectionLevel: 'H',
    }) as Promise<Buffer>;
  }

  async generateBatch(
    urls: Array<{ url: string; filename?: string }>,
    options: QrOptions = {},
  ): Promise<Array<{ url: string; filename: string; dataUrl: string }>> {
    const results = [];

    for (let i = 0; i < urls.length; i++) {
      const item = urls[i];
      if (!item) continue;
      const { url, filename } = item;
      const dataUrl = await this.generateDataUrl(url, options);
      results.push({
        url,
        filename: filename || `qr_${i + 1}.png`,
        dataUrl,
      });
    }

    return results;
  }

  getAvailableStyles(): QrStyle[] {
    return DEFAULT_STYLES;
  }

  private async addLogo(
    qrBuffer: Buffer,
    logoUrl: string,
    qrSize: number,
    logoSizePercent: number = 20,
  ): Promise<Buffer> {
    try {
      const logoSize = Math.floor(qrSize * (logoSizePercent / 100));

      // Fetch and resize logo
      const logoResponse = await fetch(logoUrl);
      const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());

      const resizedLogo = await sharp(logoBuffer)
        .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png()
        .toBuffer();

      // Calculate position to center the logo
      const position = Math.floor((qrSize - logoSize) / 2);

      // Composite logo onto QR code
      return sharp(qrBuffer)
        .composite([
          {
            input: resizedLogo,
            left: position,
            top: position,
          },
        ])
        .png()
        .toBuffer();
    } catch (error) {
      // If logo fails, return original QR
      console.error('Failed to add logo:', error);
      return qrBuffer;
    }
  }

  async generateForLink(
    shortUrl: string,
    linkId: string,
    options: QrOptions = {},
  ): Promise<{ buffer: Buffer; metadata: object }> {
    const buffer = (await this.generate(shortUrl, {
      ...options,
      errorCorrectionLevel: 'H',
    })) as Buffer;

    return {
      buffer,
      metadata: {
        linkId,
        url: shortUrl,
        generatedAt: new Date().toISOString(),
        size: options.size || 300,
        format: options.format || 'png',
      },
    };
  }

  // 添加文字标签
  private async addTextLabel(
    qrBuffer: Buffer,
    qrSize: number,
    config: TextLabelConfig,
  ): Promise<Buffer> {
    const {
      text,
      fontSize = Math.round(qrSize * 0.06),
      fontFamily = 'Arial, sans-serif',
      color = '#000000',
      position = 'bottom',
      padding = Math.round(qrSize * 0.03),
      backgroundColor,
    } = config;

    // 创建文字标签的 canvas
    const labelHeight = fontSize + padding * 2;
    const totalHeight = qrSize + labelHeight;

    const canvas = createCanvas(qrSize, totalHeight);
    const ctx = canvas.getContext('2d');

    // 设置背景
    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, qrSize, totalHeight);
    } else {
      // 使用二维码的背景色
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, qrSize, totalHeight);
    }

    // 绘制文字
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textY = position === 'bottom'
      ? qrSize + labelHeight / 2
      : labelHeight / 2;

    // 截断过长的文字
    let displayText = text;
    while (ctx.measureText(displayText).width > qrSize - padding * 2 && displayText.length > 3) {
      displayText = displayText.slice(0, -4) + '...';
    }

    ctx.fillText(displayText, qrSize / 2, textY);

    // 将 canvas 转换为 buffer
    const labelBuffer = canvas.toBuffer('image/png');

    // 使用 sharp 合成
    const qrPosition = position === 'bottom' ? 0 : labelHeight;

    return sharp(labelBuffer)
      .composite([
        {
          input: qrBuffer,
          left: 0,
          top: Math.round(qrPosition),
        },
      ])
      .png()
      .toBuffer();
  }

  // 生成带有多行文字的二维码
  async generateWithMultiLineText(
    url: string,
    lines: string[],
    options: QrOptions = {},
  ): Promise<Buffer> {
    const {
      size = 300,
      foregroundColor = '#000000',
      backgroundColor = '#ffffff',
    } = options;

    // 先生成基础二维码
    let qrBuffer = await this.generate(url, { ...options, textLabel: undefined }) as Buffer;

    if (lines.length === 0) {
      return qrBuffer;
    }

    const fontSize = Math.round(size * 0.05);
    const lineHeight = fontSize * 1.4;
    const padding = Math.round(size * 0.03);
    const textAreaHeight = lines.length * lineHeight + padding * 2;
    const totalHeight = size + textAreaHeight;

    const canvas = createCanvas(size, totalHeight);
    const ctx = canvas.getContext('2d');

    // 背景
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, totalHeight);

    // 绘制文字
    ctx.fillStyle = foregroundColor;
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    lines.forEach((line, index) => {
      const y = size + padding + lineHeight / 2 + index * lineHeight;
      ctx.fillText(line, size / 2, y);
    });

    const labelBuffer = canvas.toBuffer('image/png');

    return sharp(labelBuffer)
      .composite([
        {
          input: qrBuffer,
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();
  }
}

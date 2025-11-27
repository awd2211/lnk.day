import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as sharp from 'sharp';

export interface QrOptions {
  size?: number;
  foregroundColor?: string;
  backgroundColor?: string;
  format?: 'png' | 'svg';
  logoUrl?: string;
  logoSize?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
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
  async generate(url: string, options: QrOptions = {}): Promise<Buffer | string> {
    const {
      size = 300,
      foregroundColor = '#000000',
      backgroundColor = '#ffffff',
      format = 'png',
      margin = 2,
      errorCorrectionLevel = 'M',
    } = options;

    const qrOptions = {
      width: size,
      margin,
      errorCorrectionLevel,
      color: {
        dark: foregroundColor,
        light: backgroundColor,
      },
    };

    if (format === 'svg') {
      return QRCode.toString(url, { type: 'svg', ...qrOptions });
    }

    let qrBuffer = await QRCode.toBuffer(url, qrOptions);

    // Add logo if provided
    if (options.logoUrl && format === 'png') {
      qrBuffer = await this.addLogo(qrBuffer, options.logoUrl, size, options.logoSize);
    }

    return qrBuffer;
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

    return this.generate(url, {
      size,
      foregroundColor: style.foregroundColor,
      backgroundColor: style.backgroundColor,
      errorCorrectionLevel: 'H',
    }) as Promise<Buffer>;
  }

  async generateBatch(
    urls: Array<{ url: string; filename?: string }>,
    options: QrOptions = {},
  ): Promise<Array<{ url: string; filename: string; dataUrl: string }>> {
    const results = [];

    for (let i = 0; i < urls.length; i++) {
      const { url, filename } = urls[i];
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
}

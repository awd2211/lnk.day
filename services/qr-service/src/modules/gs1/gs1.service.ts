import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * GS1 Digital Link 服务
 * 支持 GS1 标准格式的二维码生成和解析
 *
 * GS1 Digital Link 格式示例:
 * https://example.com/01/09521234567890/21/12345?10=ABC123
 *
 * 常用 AI (Application Identifier):
 * - 01: GTIN (全球贸易项目代码)
 * - 10: 批次号
 * - 21: 序列号
 * - 17: 有效期 (YYMMDD)
 * - 37: 数量
 */

export interface GS1ApplicationIdentifier {
  ai: string;
  label: string;
  value: string;
  format?: string;
}

export interface GS1DigitalLink {
  domain: string;
  primaryKey: {
    ai: string;
    value: string;
  };
  qualifiers: GS1ApplicationIdentifier[];
  dataAttributes: GS1ApplicationIdentifier[];
  fullUrl: string;
}

export interface GS1ParseResult {
  valid: boolean;
  gtin?: string;
  serialNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity?: number;
  allIdentifiers: GS1ApplicationIdentifier[];
  digitalLink: string;
  error?: string;
}

@Injectable()
export class GS1Service {
  // GS1 AI 定义表
  private readonly aiDefinitions: Record<string, { label: string; format: string; fixedLength?: number }> = {
    '00': { label: 'SSCC', format: 'N18', fixedLength: 18 },
    '01': { label: 'GTIN', format: 'N14', fixedLength: 14 },
    '02': { label: 'CONTENT', format: 'N14', fixedLength: 14 },
    '10': { label: 'BATCH/LOT', format: 'X..20' },
    '11': { label: 'PROD DATE', format: 'N6', fixedLength: 6 },
    '12': { label: 'DUE DATE', format: 'N6', fixedLength: 6 },
    '13': { label: 'PACK DATE', format: 'N6', fixedLength: 6 },
    '15': { label: 'BEST BEFORE', format: 'N6', fixedLength: 6 },
    '17': { label: 'EXPIRY', format: 'N6', fixedLength: 6 },
    '20': { label: 'VARIANT', format: 'N2', fixedLength: 2 },
    '21': { label: 'SERIAL', format: 'X..20' },
    '22': { label: 'CPV', format: 'X..20' },
    '37': { label: 'COUNT', format: 'N..8' },
    '240': { label: 'ADDITIONAL ID', format: 'X..30' },
    '241': { label: 'CUST. PART NO.', format: 'X..30' },
    '250': { label: 'SECONDARY SERIAL', format: 'X..30' },
    '251': { label: 'REF. TO SOURCE', format: 'X..30' },
    '253': { label: 'GDTI', format: 'X..30' },
    '254': { label: 'GLN EXTENSION', format: 'X..20' },
    '30': { label: 'VAR. COUNT', format: 'N..8' },
    '310': { label: 'NET WEIGHT (kg)', format: 'N6', fixedLength: 6 },
    '320': { label: 'NET WEIGHT (lb)', format: 'N6', fixedLength: 6 },
    '400': { label: 'ORDER NUMBER', format: 'X..30' },
    '410': { label: 'SHIP TO LOC', format: 'N13', fixedLength: 13 },
    '411': { label: 'BILL TO', format: 'N13', fixedLength: 13 },
    '412': { label: 'PURCHASED FROM', format: 'N13', fixedLength: 13 },
    '414': { label: 'LOC No.', format: 'N13', fixedLength: 13 },
    '420': { label: 'SHIP TO POST', format: 'X..20' },
    '421': { label: 'SHIP TO POST (ISO)', format: 'X..12' },
    '8020': { label: 'REF No.', format: 'X..25' },
  };

  /**
   * 解析 GS1 Digital Link URL
   */
  parseDigitalLink(url: string): GS1ParseResult {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const queryParams = parsedUrl.searchParams;

      const allIdentifiers: GS1ApplicationIdentifier[] = [];
      let gtin: string | undefined;
      let serialNumber: string | undefined;
      let batchNumber: string | undefined;
      let expiryDate: string | undefined;
      let quantity: number | undefined;

      // 解析路径中的 AI
      for (let i = 0; i < pathParts.length; i += 2) {
        const ai = pathParts[i];
        const value = pathParts[i + 1];

        if (ai && value && this.aiDefinitions[ai]) {
          const def = this.aiDefinitions[ai];
          allIdentifiers.push({
            ai,
            label: def.label,
            value,
            format: def.format,
          });

          // 提取关键字段
          if (ai === '01') gtin = value;
          if (ai === '21') serialNumber = value;
          if (ai === '10') batchNumber = value;
          if (ai === '17') expiryDate = this.parseGS1Date(value);
          if (ai === '37') quantity = parseInt(value, 10);
        }
      }

      // 解析查询参数中的 AI
      queryParams.forEach((value, key) => {
        if (this.aiDefinitions[key]) {
          const def = this.aiDefinitions[key];
          allIdentifiers.push({
            ai: key,
            label: def.label,
            value,
            format: def.format,
          });

          if (key === '10') batchNumber = value;
          if (key === '17') expiryDate = this.parseGS1Date(value);
          if (key === '21') serialNumber = value;
          if (key === '37') quantity = parseInt(value, 10);
        }
      });

      if (allIdentifiers.length === 0) {
        return {
          valid: false,
          allIdentifiers: [],
          digitalLink: url,
          error: 'No valid GS1 Application Identifiers found',
        };
      }

      return {
        valid: true,
        gtin,
        serialNumber,
        batchNumber,
        expiryDate,
        quantity,
        allIdentifiers,
        digitalLink: url,
      };
    } catch (error: any) {
      return {
        valid: false,
        allIdentifiers: [],
        digitalLink: url,
        error: error.message || 'Failed to parse GS1 Digital Link',
      };
    }
  }

  /**
   * 生成 GS1 Digital Link URL
   */
  generateDigitalLink(
    domain: string,
    gtin: string,
    options?: {
      serialNumber?: string;
      batchNumber?: string;
      expiryDate?: string;
      additionalAIs?: Record<string, string>;
    },
  ): GS1DigitalLink {
    // 验证 GTIN
    if (!this.validateGTIN(gtin)) {
      throw new BadRequestException('Invalid GTIN format');
    }

    // 构建路径
    let path = `/01/${gtin}`;

    // 添加序列号作为路径的一部分
    if (options?.serialNumber) {
      path += `/21/${options.serialNumber}`;
    }

    // 构建查询参数
    const queryParams = new URLSearchParams();

    if (options?.batchNumber) {
      queryParams.set('10', options.batchNumber);
    }

    if (options?.expiryDate) {
      const formattedDate = this.formatGS1Date(options.expiryDate);
      queryParams.set('17', formattedDate);
    }

    // 添加额外的 AI
    if (options?.additionalAIs) {
      for (const [ai, value] of Object.entries(options.additionalAIs)) {
        if (this.aiDefinitions[ai]) {
          queryParams.set(ai, value);
        }
      }
    }

    const queryString = queryParams.toString();
    const fullUrl = `https://${domain}${path}${queryString ? '?' + queryString : ''}`;

    // 构建结果
    const qualifiers: GS1ApplicationIdentifier[] = [];
    const dataAttributes: GS1ApplicationIdentifier[] = [];

    if (options?.serialNumber) {
      qualifiers.push({
        ai: '21',
        label: 'SERIAL',
        value: options.serialNumber,
      });
    }

    if (options?.batchNumber) {
      dataAttributes.push({
        ai: '10',
        label: 'BATCH/LOT',
        value: options.batchNumber,
      });
    }

    if (options?.expiryDate) {
      dataAttributes.push({
        ai: '17',
        label: 'EXPIRY',
        value: this.formatGS1Date(options.expiryDate),
      });
    }

    return {
      domain,
      primaryKey: {
        ai: '01',
        value: gtin,
      },
      qualifiers,
      dataAttributes,
      fullUrl,
    };
  }

  /**
   * 从 GS1-128 条码数据解析
   */
  parseGS1Barcode(barcodeData: string): GS1ParseResult {
    const allIdentifiers: GS1ApplicationIdentifier[] = [];
    let gtin: string | undefined;
    let serialNumber: string | undefined;
    let batchNumber: string | undefined;
    let expiryDate: string | undefined;
    let quantity: number | undefined;

    // 移除 FNC1 字符 (如果存在)
    let data = barcodeData.replace(/[\x1D\u001D]/g, '|');

    // 解析 AI
    let position = 0;
    while (position < data.length) {
      let matched = false;

      // 尝试匹配不同长度的 AI (从长到短)
      for (const aiLength of [4, 3, 2]) {
        const ai = data.substring(position, position + aiLength);
        const def = this.aiDefinitions[ai];

        if (def) {
          position += aiLength;

          let value: string;
          if (def.fixedLength) {
            value = data.substring(position, position + def.fixedLength);
            position += def.fixedLength;
          } else {
            // 可变长度，读取到分隔符或结束
            const sepIndex = data.indexOf('|', position);
            if (sepIndex !== -1) {
              value = data.substring(position, sepIndex);
              position = sepIndex + 1;
            } else {
              value = data.substring(position);
              position = data.length;
            }
          }

          allIdentifiers.push({
            ai,
            label: def.label,
            value,
            format: def.format,
          });

          if (ai === '01') gtin = value;
          if (ai === '21') serialNumber = value;
          if (ai === '10') batchNumber = value;
          if (ai === '17') expiryDate = this.parseGS1Date(value);
          if (ai === '37') quantity = parseInt(value, 10);

          matched = true;
          break;
        }
      }

      if (!matched) {
        position++;
      }
    }

    return {
      valid: allIdentifiers.length > 0,
      gtin,
      serialNumber,
      batchNumber,
      expiryDate,
      quantity,
      allIdentifiers,
      digitalLink: this.generateDigitalLinkFromIdentifiers(allIdentifiers),
    };
  }

  /**
   * 验证 GTIN 校验位
   */
  validateGTIN(gtin: string): boolean {
    // 移除空格和前导零
    const cleanGtin = gtin.replace(/\s/g, '').padStart(14, '0');

    if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(cleanGtin)) {
      return false;
    }

    // 计算校验位
    const digits = cleanGtin.padStart(14, '0').split('').map(Number);
    let sum = 0;

    for (let i = 0; i < 13; i++) {
      sum += digits[i]! * (i % 2 === 0 ? 3 : 1);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === digits[13];
  }

  /**
   * 获取 AI 定义列表
   */
  getAIDefinitions(): Record<string, { label: string; format: string }> {
    return this.aiDefinitions;
  }

  // ========== 私有方法 ==========

  private parseGS1Date(dateStr: string): string {
    if (dateStr.length !== 6) return dateStr;

    const year = parseInt(dateStr.substring(0, 2), 10);
    const month = dateStr.substring(2, 4);
    const day = dateStr.substring(4, 6);

    // 假设 00-49 是 2000-2049，50-99 是 1950-1999
    const fullYear = year < 50 ? 2000 + year : 1900 + year;

    return `${fullYear}-${month}-${day}`;
  }

  private formatGS1Date(dateStr: string): string {
    // 支持多种输入格式
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const year = date.getFullYear().toString().substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}${month}${day}`;
  }

  private generateDigitalLinkFromIdentifiers(
    identifiers: GS1ApplicationIdentifier[],
  ): string {
    const gtin = identifiers.find((i) => i.ai === '01')?.value;
    if (!gtin) return '';

    let path = `/01/${gtin}`;

    // 添加序列号到路径
    const serial = identifiers.find((i) => i.ai === '21');
    if (serial) {
      path += `/21/${serial.value}`;
    }

    // 其他标识符作为查询参数
    const queryParams = new URLSearchParams();
    for (const identifier of identifiers) {
      if (identifier.ai !== '01' && identifier.ai !== '21') {
        queryParams.set(identifier.ai, identifier.value);
      }
    }

    const queryString = queryParams.toString();
    return `${path}${queryString ? '?' + queryString : ''}`;
  }
}

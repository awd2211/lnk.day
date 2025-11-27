import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { nanoid } from 'nanoid';
import { QrRecord, QrScan, QrType, QrContentType } from './qr-record.entity';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(QrRecord)
    private readonly qrRecordRepository: Repository<QrRecord>,
    @InjectRepository(QrScan)
    private readonly qrScanRepository: Repository<QrScan>,
  ) {}

  async createQrRecord(data: {
    teamId: string;
    userId: string;
    content: string;
    contentType?: QrContentType;
    type?: QrType;
    name?: string;
    linkId?: string;
    targetUrl?: string;
    style?: QrRecord['style'];
    imageUrl?: string;
    campaignId?: string;
    tags?: string[];
  }): Promise<QrRecord> {
    const shortCode = nanoid(8);

    const record = this.qrRecordRepository.create({
      ...data,
      shortCode,
      type: data.type || QrType.DYNAMIC,
      contentType: data.contentType || QrContentType.URL,
      tags: data.tags || [],
    });

    return this.qrRecordRepository.save(record);
  }

  async findByShortCode(shortCode: string): Promise<QrRecord> {
    const record = await this.qrRecordRepository.findOne({ where: { shortCode } });
    if (!record) {
      throw new NotFoundException(`QR code ${shortCode} not found`);
    }
    return record;
  }

  async findById(id: string): Promise<QrRecord> {
    const record = await this.qrRecordRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`QR record ${id} not found`);
    }
    return record;
  }

  async findAllByTeam(teamId: string): Promise<QrRecord[]> {
    return this.qrRecordRepository.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateTargetUrl(id: string, targetUrl: string): Promise<QrRecord> {
    const record = await this.findById(id);
    record.targetUrl = targetUrl;
    return this.qrRecordRepository.save(record);
  }

  async updateStyle(id: string, style: QrRecord['style']): Promise<QrRecord> {
    const record = await this.findById(id);
    record.style = { ...record.style, ...style };
    return this.qrRecordRepository.save(record);
  }

  async delete(id: string): Promise<void> {
    const record = await this.findById(id);
    await this.qrRecordRepository.remove(record);
  }

  // Scan tracking
  async recordScan(
    qrId: string,
    scanData: {
      visitorId?: string;
      ipAddress?: string;
      userAgent?: string;
      country?: string;
      region?: string;
      city?: string;
      deviceType?: string;
      browser?: string;
      os?: string;
      referer?: string;
      language?: string;
    },
  ): Promise<QrScan> {
    const record = await this.findById(qrId);

    // Check if unique scan
    let isUnique = true;
    if (scanData.visitorId || scanData.ipAddress) {
      const existing = await this.qrScanRepository.findOne({
        where: {
          qrId,
          ...(scanData.visitorId ? { visitorId: scanData.visitorId } : { ipAddress: scanData.ipAddress }),
        },
      });
      isUnique = !existing;
    }

    // Create scan record
    const scan = this.qrScanRepository.create({
      qrId,
      ...scanData,
    });
    await this.qrScanRepository.save(scan);

    // Update QR record stats
    record.scanCount += 1;
    if (isUnique) {
      record.uniqueScans += 1;
    }
    record.lastScannedAt = new Date();
    await this.qrRecordRepository.save(record);

    return scan;
  }

  async getScans(qrId: string, options?: { startDate?: Date; endDate?: Date }): Promise<QrScan[]> {
    const where: any = { qrId };

    if (options?.startDate && options?.endDate) {
      where.scannedAt = Between(options.startDate, options.endDate);
    }

    return this.qrScanRepository.find({
      where,
      order: { scannedAt: 'DESC' },
    });
  }

  async getScanStats(qrId: string, days: number = 30): Promise<{
    totalScans: number;
    uniqueScans: number;
    byCountry: Array<{ country: string; count: number }>;
    byDevice: Array<{ device: string; count: number }>;
    byDay: Array<{ date: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const scans = await this.qrScanRepository.find({
      where: {
        qrId,
        scannedAt: Between(startDate, new Date()),
      },
    });

    // Aggregate by country
    const countryMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();
    const dayMap = new Map<string, number>();
    const uniqueVisitors = new Set<string>();

    for (const scan of scans) {
      // Country
      const country = scan.country || 'Unknown';
      countryMap.set(country, (countryMap.get(country) || 0) + 1);

      // Device
      const device = scan.deviceType || 'Unknown';
      deviceMap.set(device, (deviceMap.get(device) || 0) + 1);

      // Day
      const day = scan.scannedAt.toISOString().split('T')[0];
      dayMap.set(day, (dayMap.get(day) || 0) + 1);

      // Unique
      if (scan.visitorId) {
        uniqueVisitors.add(scan.visitorId);
      } else if (scan.ipAddress) {
        uniqueVisitors.add(scan.ipAddress);
      }
    }

    return {
      totalScans: scans.length,
      uniqueScans: uniqueVisitors.size,
      byCountry: Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count),
      byDevice: Array.from(deviceMap.entries())
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count),
      byDay: Array.from(dayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getTopQrCodes(teamId: string, limit: number = 10): Promise<QrRecord[]> {
    return this.qrRecordRepository.find({
      where: { teamId },
      order: { scanCount: 'DESC' },
      take: limit,
    });
  }
}

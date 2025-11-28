import type { HttpClient } from '../../utils/http';
import type {
  QRCode,
  CreateQRCodeParams,
  QRCodeStyle,
  PaginationParams,
  PaginatedResponse,
} from '../../types';

export interface QRCodeFilter {
  linkId?: string;
  format?: 'png' | 'svg' | 'pdf';
  createdAfter?: string;
  createdBefore?: string;
}

export class QRModule {
  constructor(private http: HttpClient) {}

  async create(params: CreateQRCodeParams): Promise<QRCode> {
    return this.http.post<QRCode>('/qr', params);
  }

  async get(qrId: string): Promise<QRCode> {
    return this.http.get<QRCode>(`/qr/${qrId}`);
  }

  async getByLink(linkId: string): Promise<QRCode[]> {
    return this.http.get<QRCode[]>(`/qr/link/${linkId}`);
  }

  async delete(qrId: string): Promise<void> {
    await this.http.delete(`/qr/${qrId}`);
  }

  async list(
    filter?: QRCodeFilter,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<QRCode>> {
    return this.http.get<PaginatedResponse<QRCode>>('/qr', {
      ...filter,
      ...pagination,
    });
  }

  async updateStyle(qrId: string, style: QRCodeStyle): Promise<QRCode> {
    return this.http.patch<QRCode>(`/qr/${qrId}/style`, style);
  }

  async regenerate(
    qrId: string,
    options?: { format?: 'png' | 'svg' | 'pdf'; size?: number }
  ): Promise<QRCode> {
    return this.http.post<QRCode>(`/qr/${qrId}/regenerate`, options);
  }

  async download(qrId: string, format?: 'png' | 'svg' | 'pdf'): Promise<Blob> {
    return this.http.get(`/qr/${qrId}/download`, { format });
  }

  async bulkCreate(
    qrCodes: CreateQRCodeParams[]
  ): Promise<{
    created: QRCode[];
    failed: Array<{ index: number; error: string }>;
  }> {
    return this.http.post('/qr/bulk', { qrCodes });
  }

  async bulkDownload(
    qrIds: string[],
    format: 'png' | 'svg' | 'pdf' = 'png'
  ): Promise<Blob> {
    return this.http.post('/qr/bulk-download', { qrIds, format });
  }

  async getStats(qrId: string): Promise<{
    scanCount: number;
    uniqueScans: number;
    lastScannedAt?: string;
    scansByDay: Array<{ date: string; scans: number }>;
    scansByDevice: Array<{ device: string; scans: number }>;
  }> {
    return this.http.get(`/qr/${qrId}/stats`);
  }

  async preview(params: CreateQRCodeParams & QRCodeStyle): Promise<{
    previewUrl: string;
    expiresAt: string;
  }> {
    return this.http.post('/qr/preview', params);
  }

  async getTemplates(): Promise<Array<{
    id: string;
    name: string;
    style: QRCodeStyle;
    previewUrl: string;
  }>> {
    return this.http.get('/qr/templates');
  }

  async saveAsTemplate(
    qrId: string,
    name: string
  ): Promise<{
    id: string;
    name: string;
    style: QRCodeStyle;
  }> {
    return this.http.post(`/qr/${qrId}/save-template`, { name });
  }
}

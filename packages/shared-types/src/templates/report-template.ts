/**
 * Report Template types
 * Used for saving report configurations that can be reused
 */

import { BaseTemplate, BaseCreateTemplateDto } from './base';

export type ReportCategory = 'traffic' | 'conversion' | 'engagement' | 'comparison' | 'custom';

export type ReportDateRangeType = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_12_months' | 'custom';

export type ReportFormat = 'pdf' | 'csv' | 'excel' | 'json';

export type ReportScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportDateRange {
  type: ReportDateRangeType;
  startDate?: string;
  endDate?: string;
  compareWithPrevious?: boolean;
}

export interface ReportSchedule {
  enabled: boolean;
  frequency: ReportScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time?: string;
  timezone?: string;
  recipients: string[];
}

export interface ReportTemplate extends BaseTemplate {
  category: ReportCategory;
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange: ReportDateRange;
  groupBy?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  limitResults?: number;
  format: ReportFormat;
  includeCharts: boolean;
  includeSummary: boolean;
  customBranding?: string;
  schedule?: ReportSchedule;
  lastGeneratedAt?: string;
}

export interface CreateReportTemplateDto extends BaseCreateTemplateDto {
  category?: ReportCategory;
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange: ReportDateRange;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limitResults?: number;
  format?: ReportFormat;
  includeCharts?: boolean;
  includeSummary?: boolean;
  customBranding?: string;
  schedule?: ReportSchedule;
}

/**
 * Export utility functions for data export to CSV/JSON
 */

export interface ExportColumn {
  key: string;
  header: string;
  formatter?: (value: any) => string;
}

export interface ExportOptions {
  filename: string;
  columns: ExportColumn[];
  data: any[];
  format?: 'csv' | 'json';
}

/**
 * Format a value for CSV (handle commas, quotes, newlines)
 */
function formatCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // If the value contains commas, quotes, or newlines, wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export data to CSV format
 */
export function exportToCsv(options: ExportOptions): void {
  const { filename, columns, data } = options;

  // Build header row
  const headers = columns.map((col) => formatCsvValue(col.header));
  const headerRow = headers.join(',');

  // Build data rows
  const dataRows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col.key];
        const formattedValue = col.formatter ? col.formatter(value) : value;
        return formatCsvValue(formattedValue);
      })
      .join(',');
  });

  // Combine with BOM for Excel UTF-8 compatibility
  const bom = '\uFEFF';
  const csvContent = bom + [headerRow, ...dataRows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data to JSON format
 */
export function exportToJson(options: ExportOptions): void {
  const { filename, columns, data } = options;

  // Transform data based on columns
  const transformedData = data.map((row) => {
    const obj: Record<string, any> = {};
    columns.forEach((col) => {
      const value = row[col.key];
      obj[col.header] = col.formatter ? col.formatter(value) : value;
    });
    return obj;
  });

  const jsonContent = JSON.stringify(transformedData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Generic export function that supports multiple formats
 */
export function exportData(options: ExportOptions): void {
  const format = options.format || 'csv';

  if (format === 'json') {
    exportToJson(options);
  } else {
    exportToCsv(options);
  }
}

/**
 * Helper to trigger file download
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format number for export
 */
export function formatNumberForExport(num: number): string {
  if (num === null || num === undefined) return '';
  return num.toLocaleString();
}

/**
 * Pre-defined export configurations for common data types
 */
export const exportConfigs = {
  users: [
    { key: 'id', header: 'ID' },
    { key: 'name', header: '姓名' },
    { key: 'email', header: '邮箱' },
    { key: 'plan', header: '套餐' },
    { key: 'status', header: '状态' },
    { key: 'createdAt', header: '注册时间', formatter: formatDateForExport },
    { key: 'lastLoginAt', header: '最后登录', formatter: formatDateForExport },
  ],
  teams: [
    { key: 'id', header: 'ID' },
    { key: 'name', header: '团队名称' },
    { key: 'memberCount', header: '成员数' },
    { key: 'plan', header: '套餐' },
    { key: 'status', header: '状态' },
    { key: 'createdAt', header: '创建时间', formatter: formatDateForExport },
  ],
  links: [
    { key: 'id', header: 'ID' },
    { key: 'shortCode', header: '短码' },
    { key: 'originalUrl', header: '原始URL' },
    { key: 'clicks', header: '点击数', formatter: formatNumberForExport },
    { key: 'status', header: '状态' },
    { key: 'createdAt', header: '创建时间', formatter: formatDateForExport },
  ],
  alerts: [
    { key: 'id', header: 'ID' },
    { key: 'title', header: '标题' },
    { key: 'type', header: '类型' },
    { key: 'source', header: '来源' },
    { key: 'status', header: '状态' },
    { key: 'createdAt', header: '创建时间', formatter: formatDateForExport },
    { key: 'resolvedAt', header: '解决时间', formatter: formatDateForExport },
  ],
  analytics: [
    { key: 'date', header: '日期' },
    { key: 'clicks', header: '总点击', formatter: formatNumberForExport },
    { key: 'uniqueClicks', header: '独立访客', formatter: formatNumberForExport },
  ],
};

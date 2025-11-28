/**
 * QR 码内容类型
 */
export enum QRContentType {
  URL = 'url',
  PHONE = 'phone',
  SMS = 'sms',
  EMAIL = 'email',
  WIFI = 'wifi',
  VCARD = 'vcard',
  CALENDAR = 'calendar',
  GEO = 'geo',
}

export interface QRTypeInfo {
  type: QRContentType;
  label: string;
  description: string;
  icon: string;
}

export const QR_TYPES: QRTypeInfo[] = [
  { type: QRContentType.URL, label: 'URL', description: '网址链接', icon: 'Link' },
  { type: QRContentType.PHONE, label: '电话', description: '拨打电话', icon: 'Phone' },
  { type: QRContentType.SMS, label: '短信', description: '发送短信', icon: 'MessageSquare' },
  { type: QRContentType.EMAIL, label: '邮件', description: '发送邮件', icon: 'Mail' },
  { type: QRContentType.WIFI, label: 'WiFi', description: '连接网络', icon: 'Wifi' },
  { type: QRContentType.VCARD, label: '名片', description: '电子名片', icon: 'User' },
  { type: QRContentType.CALENDAR, label: '日历', description: '添加日程', icon: 'Calendar' },
  { type: QRContentType.GEO, label: '位置', description: '地理定位', icon: 'MapPin' },
];

// 各类型的数据结构
export interface PhoneContent {
  phone: string;
}

export interface SMSContent {
  phone: string;
  message?: string;
}

export interface EmailContent {
  to: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
}

export interface WiFiContent {
  ssid: string;
  password?: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

export interface VCardContent {
  firstName: string;
  lastName?: string;
  organization?: string;
  title?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  email?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  note?: string;
}

export interface CalendarContent {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
}

export interface GeoContent {
  latitude: number;
  longitude: number;
  query?: string;
}

export interface URLContent {
  url: string;
}

export type QRContent =
  | { type: QRContentType.URL; data: URLContent }
  | { type: QRContentType.PHONE; data: PhoneContent }
  | { type: QRContentType.SMS; data: SMSContent }
  | { type: QRContentType.EMAIL; data: EmailContent }
  | { type: QRContentType.WIFI; data: WiFiContent }
  | { type: QRContentType.VCARD; data: VCardContent }
  | { type: QRContentType.CALENDAR; data: CalendarContent }
  | { type: QRContentType.GEO; data: GeoContent };

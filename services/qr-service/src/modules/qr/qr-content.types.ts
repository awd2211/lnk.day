/**
 * QR 码内容类型枚举
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
  TEXT = 'text',
  // App-specific QR codes
  APPLE_PODCASTS = 'apple_podcasts',
  SPOTIFY = 'spotify',
  YOUTUBE = 'youtube',
  APP_STORE = 'app_store',
  GOOGLE_PLAY = 'google_play',
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  PAYPAL = 'paypal',
  VENMO = 'venmo',
  BITCOIN = 'bitcoin',
  ETHEREUM = 'ethereum',
}

/**
 * 各类型内容的数据结构
 */
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
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  allDay?: boolean;
}

export interface GeoContent {
  latitude: number;
  longitude: number;
  query?: string; // 地点名称
}

export interface TextContent {
  text: string;
}

export interface URLContent {
  url: string;
}

// ========== App-specific Content Types ==========

export interface ApplePodcastsContent {
  podcastId?: string;      // Apple Podcasts ID
  podcastUrl?: string;     // 完整 URL
  showName?: string;       // 节目名称 (用于搜索)
}

export interface SpotifyContent {
  type: 'track' | 'album' | 'artist' | 'playlist' | 'show' | 'episode';
  id: string;              // Spotify URI ID
}

export interface YouTubeContent {
  type: 'video' | 'channel' | 'playlist';
  id: string;              // Video/Channel/Playlist ID
  timestamp?: number;      // 视频开始时间 (秒)
}

export interface AppStoreContent {
  appId: string;           // App Store app ID
  country?: string;        // 国家代码 (如 cn, us)
  campaignToken?: string;  // 营销追踪令牌
}

export interface GooglePlayContent {
  packageName: string;     // Android 包名
  referrer?: string;       // UTM 参数
}

export interface InstagramContent {
  type: 'profile' | 'post' | 'reel';
  username?: string;       // 用户名
  postId?: string;         // 帖子/Reel ID
}

export interface TikTokContent {
  type: 'profile' | 'video';
  username?: string;
  videoId?: string;
}

export interface FacebookContent {
  type: 'profile' | 'page' | 'group' | 'event';
  id?: string;             // 用户/页面/群组/活动 ID
  username?: string;       // 用户名
}

export interface TwitterContent {
  type: 'profile' | 'tweet';
  username?: string;
  tweetId?: string;
}

export interface LinkedInContent {
  type: 'profile' | 'company' | 'post';
  username?: string;       // 个人用户名
  companyId?: string;      // 公司 ID
  postId?: string;
}

export interface WhatsAppContent {
  phone: string;           // 电话号码 (含国际区号)
  message?: string;        // 预填消息
}

export interface TelegramContent {
  type: 'profile' | 'group' | 'channel';
  username: string;        // @username
}

export interface PayPalContent {
  email?: string;          // PayPal email
  paypalMe?: string;       // PayPal.Me 用户名
  amount?: number;         // 预填金额
  currency?: string;       // 货币代码
  note?: string;           // 备注
}

export interface VenmoContent {
  username: string;        // Venmo 用户名
  amount?: number;
  note?: string;
}

export interface BitcoinContent {
  address: string;         // BTC 地址
  amount?: number;         // 金额 (BTC)
  label?: string;          // 标签
  message?: string;        // 消息
}

export interface EthereumContent {
  address: string;         // ETH 地址
  amount?: number;         // 金额 (ETH)
  gas?: number;            // Gas limit
  chainId?: number;        // 链 ID (1=mainnet)
}

export type QRContentData =
  | { type: QRContentType.URL; data: URLContent }
  | { type: QRContentType.PHONE; data: PhoneContent }
  | { type: QRContentType.SMS; data: SMSContent }
  | { type: QRContentType.EMAIL; data: EmailContent }
  | { type: QRContentType.WIFI; data: WiFiContent }
  | { type: QRContentType.VCARD; data: VCardContent }
  | { type: QRContentType.CALENDAR; data: CalendarContent }
  | { type: QRContentType.GEO; data: GeoContent }
  | { type: QRContentType.TEXT; data: TextContent }
  // App-specific
  | { type: QRContentType.APPLE_PODCASTS; data: ApplePodcastsContent }
  | { type: QRContentType.SPOTIFY; data: SpotifyContent }
  | { type: QRContentType.YOUTUBE; data: YouTubeContent }
  | { type: QRContentType.APP_STORE; data: AppStoreContent }
  | { type: QRContentType.GOOGLE_PLAY; data: GooglePlayContent }
  | { type: QRContentType.INSTAGRAM; data: InstagramContent }
  | { type: QRContentType.TIKTOK; data: TikTokContent }
  | { type: QRContentType.FACEBOOK; data: FacebookContent }
  | { type: QRContentType.TWITTER; data: TwitterContent }
  | { type: QRContentType.LINKEDIN; data: LinkedInContent }
  | { type: QRContentType.WHATSAPP; data: WhatsAppContent }
  | { type: QRContentType.TELEGRAM; data: TelegramContent }
  | { type: QRContentType.PAYPAL; data: PayPalContent }
  | { type: QRContentType.VENMO; data: VenmoContent }
  | { type: QRContentType.BITCOIN; data: BitcoinContent }
  | { type: QRContentType.ETHEREUM; data: EthereumContent };

/**
 * QR 内容编码器
 * 将结构化数据转换为二维码可识别的字符串
 */
export class QRContentEncoder {
  /**
   * 根据类型编码内容
   */
  static encode(content: QRContentData): string {
    switch (content.type) {
      case QRContentType.URL:
        return this.encodeURL(content.data);
      case QRContentType.PHONE:
        return this.encodePhone(content.data);
      case QRContentType.SMS:
        return this.encodeSMS(content.data);
      case QRContentType.EMAIL:
        return this.encodeEmail(content.data);
      case QRContentType.WIFI:
        return this.encodeWiFi(content.data);
      case QRContentType.VCARD:
        return this.encodeVCard(content.data);
      case QRContentType.CALENDAR:
        return this.encodeCalendar(content.data);
      case QRContentType.GEO:
        return this.encodeGeo(content.data);
      case QRContentType.TEXT:
        return content.data.text;
      // App-specific encoders
      case QRContentType.APPLE_PODCASTS:
        return this.encodeApplePodcasts(content.data);
      case QRContentType.SPOTIFY:
        return this.encodeSpotify(content.data);
      case QRContentType.YOUTUBE:
        return this.encodeYouTube(content.data);
      case QRContentType.APP_STORE:
        return this.encodeAppStore(content.data);
      case QRContentType.GOOGLE_PLAY:
        return this.encodeGooglePlay(content.data);
      case QRContentType.INSTAGRAM:
        return this.encodeInstagram(content.data);
      case QRContentType.TIKTOK:
        return this.encodeTikTok(content.data);
      case QRContentType.FACEBOOK:
        return this.encodeFacebook(content.data);
      case QRContentType.TWITTER:
        return this.encodeTwitter(content.data);
      case QRContentType.LINKEDIN:
        return this.encodeLinkedIn(content.data);
      case QRContentType.WHATSAPP:
        return this.encodeWhatsApp(content.data);
      case QRContentType.TELEGRAM:
        return this.encodeTelegram(content.data);
      case QRContentType.PAYPAL:
        return this.encodePayPal(content.data);
      case QRContentType.VENMO:
        return this.encodeVenmo(content.data);
      case QRContentType.BITCOIN:
        return this.encodeBitcoin(content.data);
      case QRContentType.ETHEREUM:
        return this.encodeEthereum(content.data);
      default:
        throw new Error(`Unsupported content type`);
    }
  }

  /**
   * URL 编码
   */
  private static encodeURL(data: URLContent): string {
    let url = data.url;
    // 确保 URL 有协议前缀
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }
    return url;
  }

  /**
   * 电话编码: tel:+8613812345678
   */
  private static encodePhone(data: PhoneContent): string {
    const phone = data.phone.replace(/[\s\-()]/g, '');
    return `tel:${phone}`;
  }

  /**
   * 短信编码: sms:+8613812345678?body=Hello
   */
  private static encodeSMS(data: SMSContent): string {
    const phone = data.phone.replace(/[\s\-()]/g, '');
    let sms = `sms:${phone}`;
    if (data.message) {
      sms += `?body=${encodeURIComponent(data.message)}`;
    }
    return sms;
  }

  /**
   * 邮件编码: mailto:test@example.com?subject=Hi&body=Hello
   */
  private static encodeEmail(data: EmailContent): string {
    const params: string[] = [];
    if (data.subject) params.push(`subject=${encodeURIComponent(data.subject)}`);
    if (data.body) params.push(`body=${encodeURIComponent(data.body)}`);
    if (data.cc) params.push(`cc=${encodeURIComponent(data.cc)}`);
    if (data.bcc) params.push(`bcc=${encodeURIComponent(data.bcc)}`);

    let mailto = `mailto:${data.to}`;
    if (params.length > 0) {
      mailto += '?' + params.join('&');
    }
    return mailto;
  }

  /**
   * WiFi 编码: WIFI:T:WPA;S:NetworkName;P:password;;
   */
  private static encodeWiFi(data: WiFiContent): string {
    const escape = (str: string) => str.replace(/[\\;,:]/g, '\\$&');
    let wifi = `WIFI:T:${data.encryption};S:${escape(data.ssid)};`;
    if (data.password && data.encryption !== 'nopass') {
      wifi += `P:${escape(data.password)};`;
    }
    if (data.hidden) {
      wifi += 'H:true;';
    }
    wifi += ';';
    return wifi;
  }

  /**
   * vCard 编码 (vCard 3.0)
   */
  private static encodeVCard(data: VCardContent): string {
    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
    ];

    // 姓名
    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');
    lines.push(`FN:${fullName}`);
    lines.push(`N:${data.lastName || ''};${data.firstName};;;`);

    if (data.organization) lines.push(`ORG:${data.organization}`);
    if (data.title) lines.push(`TITLE:${data.title}`);
    if (data.phone) lines.push(`TEL;TYPE=WORK,VOICE:${data.phone}`);
    if (data.mobile) lines.push(`TEL;TYPE=CELL:${data.mobile}`);
    if (data.fax) lines.push(`TEL;TYPE=FAX:${data.fax}`);
    if (data.email) lines.push(`EMAIL:${data.email}`);
    if (data.website) lines.push(`URL:${data.website}`);

    // 地址
    if (data.street || data.city || data.state || data.zip || data.country) {
      const addr = [
        '', '', // PO Box, Extended Address
        data.street || '',
        data.city || '',
        data.state || '',
        data.zip || '',
        data.country || '',
      ].join(';');
      lines.push(`ADR;TYPE=WORK:${addr}`);
    }

    if (data.note) lines.push(`NOTE:${data.note}`);

    lines.push('END:VCARD');
    return lines.join('\n');
  }

  /**
   * 日历事件编码 (iCalendar/vEvent)
   */
  private static encodeCalendar(data: CalendarContent): string {
    const formatDate = (dateStr: string, allDay?: boolean) => {
      const date = new Date(dateStr);
      if (allDay) {
        return date.toISOString().slice(0, 10).replace(/-/g, '');
      }
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const lines: string[] = [
      'BEGIN:VEVENT',
    ];

    if (data.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDate(data.startTime, true)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDate(data.endTime, true)}`);
    } else {
      lines.push(`DTSTART:${formatDate(data.startTime)}`);
      lines.push(`DTEND:${formatDate(data.endTime)}`);
    }

    lines.push(`SUMMARY:${data.title}`);
    if (data.description) lines.push(`DESCRIPTION:${data.description}`);
    if (data.location) lines.push(`LOCATION:${data.location}`);

    lines.push('END:VEVENT');
    return lines.join('\n');
  }

  /**
   * 地理位置编码: geo:39.9042,116.4074 或 geo:39.9042,116.4074?q=Place
   */
  private static encodeGeo(data: GeoContent): string {
    let geo = `geo:${data.latitude},${data.longitude}`;
    if (data.query) {
      geo += `?q=${encodeURIComponent(data.query)}`;
    }
    return geo;
  }

  // ========== App-specific Encoders ==========

  /**
   * Apple Podcasts 编码
   * 支持 ID、URL 或搜索
   */
  private static encodeApplePodcasts(data: ApplePodcastsContent): string {
    if (data.podcastUrl) {
      return data.podcastUrl;
    }
    if (data.podcastId) {
      return `https://podcasts.apple.com/podcast/id${data.podcastId}`;
    }
    if (data.showName) {
      return `https://podcasts.apple.com/search?term=${encodeURIComponent(data.showName)}`;
    }
    throw new Error('Apple Podcasts requires podcastId, podcastUrl, or showName');
  }

  /**
   * Spotify 编码
   * spotify:track:4iV5W9uYEdYUVa79Axb7Rh 或 https://open.spotify.com/track/...
   */
  private static encodeSpotify(data: SpotifyContent): string {
    // 使用 Universal Link 格式，在移动端会自动打开 Spotify App
    return `https://open.spotify.com/${data.type}/${data.id}`;
  }

  /**
   * YouTube 编码
   */
  private static encodeYouTube(data: YouTubeContent): string {
    switch (data.type) {
      case 'video':
        let url = `https://www.youtube.com/watch?v=${data.id}`;
        if (data.timestamp) {
          url += `&t=${data.timestamp}`;
        }
        return url;
      case 'channel':
        return `https://www.youtube.com/channel/${data.id}`;
      case 'playlist':
        return `https://www.youtube.com/playlist?list=${data.id}`;
      default:
        throw new Error('Invalid YouTube content type');
    }
  }

  /**
   * App Store 编码
   * https://apps.apple.com/app/id123456789
   */
  private static encodeAppStore(data: AppStoreContent): string {
    let url = `https://apps.apple.com`;
    if (data.country) {
      url += `/${data.country}`;
    }
    url += `/app/id${data.appId}`;
    if (data.campaignToken) {
      url += `?ct=${encodeURIComponent(data.campaignToken)}`;
    }
    return url;
  }

  /**
   * Google Play 编码
   * market://details?id=com.example.app 或 https://play.google.com/store/apps/details?id=...
   */
  private static encodeGooglePlay(data: GooglePlayContent): string {
    let url = `https://play.google.com/store/apps/details?id=${data.packageName}`;
    if (data.referrer) {
      url += `&referrer=${encodeURIComponent(data.referrer)}`;
    }
    return url;
  }

  /**
   * Instagram 编码
   */
  private static encodeInstagram(data: InstagramContent): string {
    switch (data.type) {
      case 'profile':
        return `https://instagram.com/${data.username}`;
      case 'post':
        return `https://instagram.com/p/${data.postId}`;
      case 'reel':
        return `https://instagram.com/reel/${data.postId}`;
      default:
        throw new Error('Invalid Instagram content type');
    }
  }

  /**
   * TikTok 编码
   */
  private static encodeTikTok(data: TikTokContent): string {
    switch (data.type) {
      case 'profile':
        return `https://www.tiktok.com/@${data.username}`;
      case 'video':
        return `https://www.tiktok.com/@${data.username}/video/${data.videoId}`;
      default:
        throw new Error('Invalid TikTok content type');
    }
  }

  /**
   * Facebook 编码
   */
  private static encodeFacebook(data: FacebookContent): string {
    switch (data.type) {
      case 'profile':
        return data.username
          ? `https://facebook.com/${data.username}`
          : `https://facebook.com/profile.php?id=${data.id}`;
      case 'page':
        return `https://facebook.com/${data.username || data.id}`;
      case 'group':
        return `https://facebook.com/groups/${data.id}`;
      case 'event':
        return `https://facebook.com/events/${data.id}`;
      default:
        throw new Error('Invalid Facebook content type');
    }
  }

  /**
   * Twitter/X 编码
   */
  private static encodeTwitter(data: TwitterContent): string {
    switch (data.type) {
      case 'profile':
        return `https://twitter.com/${data.username}`;
      case 'tweet':
        return `https://twitter.com/${data.username}/status/${data.tweetId}`;
      default:
        throw new Error('Invalid Twitter content type');
    }
  }

  /**
   * LinkedIn 编码
   */
  private static encodeLinkedIn(data: LinkedInContent): string {
    switch (data.type) {
      case 'profile':
        return `https://linkedin.com/in/${data.username}`;
      case 'company':
        return `https://linkedin.com/company/${data.companyId}`;
      case 'post':
        return `https://linkedin.com/feed/update/${data.postId}`;
      default:
        throw new Error('Invalid LinkedIn content type');
    }
  }

  /**
   * WhatsApp 编码
   * https://wa.me/8613812345678?text=Hello
   */
  private static encodeWhatsApp(data: WhatsAppContent): string {
    const phone = data.phone.replace(/[\s\-()]/g, '');
    let url = `https://wa.me/${phone}`;
    if (data.message) {
      url += `?text=${encodeURIComponent(data.message)}`;
    }
    return url;
  }

  /**
   * Telegram 编码
   */
  private static encodeTelegram(data: TelegramContent): string {
    const username = data.username.replace(/^@/, '');
    return `https://t.me/${username}`;
  }

  /**
   * PayPal 编码
   * https://paypal.me/username/10USD 或 https://www.paypal.com/paypalme/username
   */
  private static encodePayPal(data: PayPalContent): string {
    if (data.paypalMe) {
      let url = `https://paypal.me/${data.paypalMe}`;
      if (data.amount) {
        url += `/${data.amount}${data.currency || 'USD'}`;
      }
      return url;
    }
    if (data.email) {
      // 使用 PayPal 付款链接
      const params: string[] = [`business=${encodeURIComponent(data.email)}`];
      if (data.amount) params.push(`amount=${data.amount}`);
      if (data.currency) params.push(`currency_code=${data.currency}`);
      if (data.note) params.push(`item_name=${encodeURIComponent(data.note)}`);
      return `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&${params.join('&')}`;
    }
    throw new Error('PayPal requires either email or paypalMe username');
  }

  /**
   * Venmo 编码
   * https://venmo.com/username?txn=pay&amount=10&note=Thanks
   */
  private static encodeVenmo(data: VenmoContent): string {
    let url = `https://venmo.com/${data.username}`;
    const params: string[] = [];
    if (data.amount) params.push(`amount=${data.amount}`);
    if (data.note) params.push(`note=${encodeURIComponent(data.note)}`);
    if (params.length > 0) {
      url += `?txn=pay&${params.join('&')}`;
    }
    return url;
  }

  /**
   * Bitcoin 编码
   * bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.001&label=Donation&message=Thanks
   */
  private static encodeBitcoin(data: BitcoinContent): string {
    let btc = `bitcoin:${data.address}`;
    const params: string[] = [];
    if (data.amount) params.push(`amount=${data.amount}`);
    if (data.label) params.push(`label=${encodeURIComponent(data.label)}`);
    if (data.message) params.push(`message=${encodeURIComponent(data.message)}`);
    if (params.length > 0) {
      btc += '?' + params.join('&');
    }
    return btc;
  }

  /**
   * Ethereum 编码
   * ethereum:0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7?value=1e18&gas=21000
   */
  private static encodeEthereum(data: EthereumContent): string {
    let eth = `ethereum:${data.address}`;
    const params: string[] = [];
    if (data.amount) {
      // 转换为 Wei (1 ETH = 1e18 Wei)
      const weiAmount = data.amount * 1e18;
      params.push(`value=${weiAmount}`);
    }
    if (data.gas) params.push(`gas=${data.gas}`);
    if (data.chainId && data.chainId !== 1) params.push(`chainId=${data.chainId}`);
    if (params.length > 0) {
      eth += '?' + params.join('&');
    }
    return eth;
  }
}

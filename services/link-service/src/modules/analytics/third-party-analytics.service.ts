import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AnalyticsPlatform = 'ga4' | 'facebook_pixel' | 'tiktok_pixel' | 'google_ads' | 'linkedin_insight';

export interface PixelConfig {
  platform: AnalyticsPlatform;
  pixelId: string;
  enabled: boolean;
  events?: string[]; // Which events to track
}

export interface TrackingEvent {
  eventName: string;
  linkId: string;
  shortCode: string;
  url: string;
  userId?: string;
  teamId?: string;
  metadata?: Record<string, any>;
}

export interface PixelPayload {
  platform: AnalyticsPlatform;
  pixelId: string;
  eventName: string;
  eventData: Record<string, any>;
}

@Injectable()
export class ThirdPartyAnalyticsService {
  private readonly logger = new Logger(ThirdPartyAnalyticsService.name);

  constructor(private readonly configService: ConfigService) {}

  // Generate tracking script for embedding in redirect pages
  generateTrackingScript(pixels: PixelConfig[], event: TrackingEvent): string {
    const scripts: string[] = [];

    for (const pixel of pixels) {
      if (!pixel.enabled) continue;

      switch (pixel.platform) {
        case 'ga4':
          scripts.push(this.generateGA4Script(pixel.pixelId, event));
          break;
        case 'facebook_pixel':
          scripts.push(this.generateFacebookPixelScript(pixel.pixelId, event));
          break;
        case 'tiktok_pixel':
          scripts.push(this.generateTikTokPixelScript(pixel.pixelId, event));
          break;
        case 'google_ads':
          scripts.push(this.generateGoogleAdsScript(pixel.pixelId, event));
          break;
        case 'linkedin_insight':
          scripts.push(this.generateLinkedInInsightScript(pixel.pixelId, event));
          break;
      }
    }

    return scripts.join('\n');
  }

  private generateGA4Script(measurementId: string, event: TrackingEvent): string {
    return `
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${measurementId}');
  gtag('event', '${event.eventName}', {
    'link_id': '${event.linkId}',
    'short_code': '${event.shortCode}',
    'destination_url': '${event.url}',
    ${event.metadata ? Object.entries(event.metadata).map(([k, v]) => `'${k}': '${v}'`).join(',\n    ') : ''}
  });
</script>`;
  }

  private generateFacebookPixelScript(pixelId: string, event: TrackingEvent): string {
    const eventData = {
      content_name: event.shortCode,
      content_category: 'link_click',
      link_id: event.linkId,
      destination_url: event.url,
      ...event.metadata,
    };

    return `
<!-- Facebook Pixel -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${pixelId}');
  fbq('track', 'PageView');
  fbq('track', '${this.mapEventToFacebook(event.eventName)}', ${JSON.stringify(eventData)});
</script>
<noscript>
  <img height="1" width="1" style="display:none"
       src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>
</noscript>`;
  }

  private generateTikTokPixelScript(pixelId: string, event: TrackingEvent): string {
    const eventData = {
      content_id: event.linkId,
      content_name: event.shortCode,
      content_type: 'link',
      ...event.metadata,
    };

    return `
<!-- TikTok Pixel -->
<script>
  !function (w, d, t) {
    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
    ttq.load('${pixelId}');
    ttq.page();
    ttq.track('${this.mapEventToTikTok(event.eventName)}', ${JSON.stringify(eventData)});
  }(window, document, 'ttq');
</script>`;
  }

  private generateGoogleAdsScript(conversionId: string, event: TrackingEvent): string {
    // Format: AW-XXXXXXXXX/XXXXXXXXXXXXXXXXXXX
    const [accountId, conversionLabel] = conversionId.split('/');

    return `
<!-- Google Ads Conversion Tracking -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${accountId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${accountId}');
  ${conversionLabel ? `gtag('event', 'conversion', {'send_to': '${conversionId}'});` : ''}
</script>`;
  }

  private generateLinkedInInsightScript(partnerId: string, event: TrackingEvent): string {
    return `
<!-- LinkedIn Insight Tag -->
<script type="text/javascript">
  _linkedin_partner_id = "${partnerId}";
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script>
<script type="text/javascript">
  (function(l) {
    if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
    window.lintrk.q=[]}
    var s = document.getElementsByTagName("script")[0];
    var b = document.createElement("script");
    b.type = "text/javascript";b.async = true;
    b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
    s.parentNode.insertBefore(b, s);
  })(window.lintrk);
</script>
<noscript>
  <img height="1" width="1" style="display:none;" alt=""
       src="https://px.ads.linkedin.com/collect/?pid=${partnerId}&fmt=gif" />
</noscript>`;
  }

  // Server-side event tracking (Conversions API)
  async trackServerSideEvent(pixel: PixelConfig, event: TrackingEvent, clientData?: {
    ip?: string;
    userAgent?: string;
    fbc?: string;  // Facebook click ID
    fbp?: string;  // Facebook browser ID
  }): Promise<boolean> {
    switch (pixel.platform) {
      case 'facebook_pixel':
        return this.sendFacebookConversionsAPI(pixel.pixelId, event, clientData);
      case 'tiktok_pixel':
        return this.sendTikTokEventsAPI(pixel.pixelId, event, clientData);
      default:
        this.logger.warn(`Server-side tracking not supported for ${pixel.platform}`);
        return false;
    }
  }

  private async sendFacebookConversionsAPI(
    pixelId: string,
    event: TrackingEvent,
    clientData?: { ip?: string; userAgent?: string; fbc?: string; fbp?: string },
  ): Promise<boolean> {
    const accessToken = this.configService.get<string>('FACEBOOK_CONVERSIONS_API_TOKEN');
    if (!accessToken) {
      this.logger.warn('Facebook Conversions API token not configured');
      return false;
    }

    try {
      const eventData = {
        data: [
          {
            event_name: this.mapEventToFacebook(event.eventName),
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_source_url: event.url,
            user_data: {
              client_ip_address: clientData?.ip,
              client_user_agent: clientData?.userAgent,
              fbc: clientData?.fbc,
              fbp: clientData?.fbp,
            },
            custom_data: {
              content_name: event.shortCode,
              content_category: 'link_click',
              link_id: event.linkId,
              ...event.metadata,
            },
          },
        ],
      };

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        },
      );

      const result = await response.json();
      if (result.events_received) {
        this.logger.debug(`Facebook Conversions API: ${result.events_received} events sent`);
        return true;
      }

      this.logger.error(`Facebook Conversions API error: ${JSON.stringify(result)}`);
      return false;
    } catch (error) {
      this.logger.error(`Facebook Conversions API failed: ${error.message}`);
      return false;
    }
  }

  private async sendTikTokEventsAPI(
    pixelId: string,
    event: TrackingEvent,
    clientData?: { ip?: string; userAgent?: string },
  ): Promise<boolean> {
    const accessToken = this.configService.get<string>('TIKTOK_EVENTS_API_TOKEN');
    if (!accessToken) {
      this.logger.warn('TikTok Events API token not configured');
      return false;
    }

    try {
      const eventData = {
        pixel_code: pixelId,
        event: this.mapEventToTikTok(event.eventName),
        event_id: `${event.linkId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        context: {
          ip: clientData?.ip,
          user_agent: clientData?.userAgent,
          page: {
            url: event.url,
          },
        },
        properties: {
          content_id: event.linkId,
          content_name: event.shortCode,
          content_type: 'link',
          ...event.metadata,
        },
      };

      const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/pixel/track/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': accessToken,
        },
        body: JSON.stringify({ data: [eventData] }),
      });

      const result = await response.json();
      if (result.code === 0) {
        this.logger.debug(`TikTok Events API: event sent successfully`);
        return true;
      }

      this.logger.error(`TikTok Events API error: ${JSON.stringify(result)}`);
      return false;
    } catch (error) {
      this.logger.error(`TikTok Events API failed: ${error.message}`);
      return false;
    }
  }

  // Event name mapping
  private mapEventToFacebook(eventName: string): string {
    const mapping: Record<string, string> = {
      link_click: 'ViewContent',
      link_created: 'Lead',
      qr_scan: 'ViewContent',
      page_view: 'PageView',
      conversion: 'Purchase',
    };
    return mapping[eventName] || 'CustomEvent';
  }

  private mapEventToTikTok(eventName: string): string {
    const mapping: Record<string, string> = {
      link_click: 'ViewContent',
      link_created: 'SubmitForm',
      qr_scan: 'ViewContent',
      page_view: 'Pageview',
      conversion: 'CompletePayment',
    };
    return mapping[eventName] || eventName;
  }

  // Validate pixel configuration
  validatePixelConfig(config: PixelConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.pixelId) {
      errors.push('Pixel ID is required');
    }

    switch (config.platform) {
      case 'ga4':
        if (!config.pixelId.startsWith('G-')) {
          errors.push('GA4 Measurement ID should start with G-');
        }
        break;
      case 'facebook_pixel':
        if (!/^\d{15,16}$/.test(config.pixelId)) {
          errors.push('Facebook Pixel ID should be a 15-16 digit number');
        }
        break;
      case 'tiktok_pixel':
        if (!/^[A-Z0-9]{20,}$/.test(config.pixelId)) {
          errors.push('TikTok Pixel ID format is invalid');
        }
        break;
      case 'google_ads':
        if (!config.pixelId.startsWith('AW-')) {
          errors.push('Google Ads conversion ID should start with AW-');
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  }
}

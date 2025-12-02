import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SeoMeta {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  robots?: string;
  author?: string;
  language?: string;
}

export interface OpenGraphMeta {
  title: string;
  description: string;
  type: 'website' | 'article' | 'profile' | 'product';
  url: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  siteName?: string;
  locale?: string;
  // For articles
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  articleAuthor?: string;
  // For profiles
  profileFirstName?: string;
  profileLastName?: string;
  profileUsername?: string;
}

export interface TwitterCardMeta {
  card: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
}

export interface JsonLdData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export interface PageSeoData {
  meta: SeoMeta;
  openGraph: OpenGraphMeta;
  twitterCard: TwitterCardMeta;
  jsonLd: JsonLdData[];
}

export interface SeoInput {
  title: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url: string;
  type?: 'website' | 'article' | 'profile' | 'product';
  siteName?: string;
  author?: string;
  publishedAt?: Date;
  updatedAt?: Date;
  // For profiles
  profileName?: string;
  profileUsername?: string;
  profileBio?: string;
  // For products
  productPrice?: number;
  productCurrency?: string;
  productAvailability?: string;
}

@Injectable()
export class SeoService implements OnModuleInit {
  private readonly logger = new Logger(SeoService.name);
  private readonly defaultSiteName: string;
  private readonly defaultTwitterSite: string;
  private readonly defaultImage: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const brandName = this.configService.get('BRAND_NAME', 'lnk.day');
    const brandDomain = this.configService.get('BRAND_DOMAIN', 'lnk.day');
    this.defaultSiteName = brandName;
    this.defaultTwitterSite = this.configService.get('TWITTER_SITE', '@lnkday');
    this.defaultImage = this.configService.get('DEFAULT_OG_IMAGE', `https://${brandDomain}/og-image.png`);
    this.baseUrl = this.configService.get('BASE_URL', `https://${brandDomain}`);
  }

  onModuleInit() {
    // ConfigService injected
  }

  /**
   * Generate complete SEO data for a page
   */
  generateSeoData(input: SeoInput): PageSeoData {
    const meta = this.generateMeta(input);
    const openGraph = this.generateOpenGraph(input);
    const twitterCard = this.generateTwitterCard(input);
    const jsonLd = this.generateJsonLd(input);

    return {
      meta,
      openGraph,
      twitterCard,
      jsonLd,
    };
  }

  /**
   * Generate basic meta tags
   */
  generateMeta(input: SeoInput): SeoMeta {
    return {
      title: this.truncate(input.title, 60),
      description: this.truncate(input.description || this.generateDescription(input), 160),
      keywords: input.keywords,
      canonicalUrl: input.url,
      robots: 'index, follow',
      author: input.author,
      language: 'zh-CN',
    };
  }

  /**
   * Generate Open Graph meta tags
   */
  generateOpenGraph(input: SeoInput): OpenGraphMeta {
    return {
      title: this.truncate(input.title, 60),
      description: this.truncate(input.description || this.generateDescription(input), 200),
      type: input.type || 'website',
      url: input.url,
      image: input.image || this.defaultImage,
      imageWidth: 1200,
      imageHeight: 630,
      siteName: input.siteName || this.defaultSiteName,
      locale: 'zh_CN',
      ...(input.publishedAt && {
        articlePublishedTime: input.publishedAt.toISOString(),
      }),
      ...(input.updatedAt && {
        articleModifiedTime: input.updatedAt.toISOString(),
      }),
      ...(input.author && {
        articleAuthor: input.author,
      }),
      ...(input.profileName && {
        profileFirstName: input.profileName.split(' ')[0],
        profileLastName: input.profileName.split(' ').slice(1).join(' '),
      }),
      ...(input.profileUsername && {
        profileUsername: input.profileUsername,
      }),
    };
  }

  /**
   * Generate Twitter Card meta tags
   */
  generateTwitterCard(input: SeoInput): TwitterCardMeta {
    return {
      card: input.image ? 'summary_large_image' : 'summary',
      site: this.defaultTwitterSite,
      creator: input.profileUsername ? `@${input.profileUsername}` : undefined,
      title: this.truncate(input.title, 70),
      description: this.truncate(input.description || this.generateDescription(input), 200),
      image: input.image || this.defaultImage,
      imageAlt: input.title,
    };
  }

  /**
   * Generate JSON-LD structured data
   */
  generateJsonLd(input: SeoInput): JsonLdData[] {
    const jsonLdItems: JsonLdData[] = [];

    // Website schema
    if (input.type === 'website' || !input.type) {
      jsonLdItems.push({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: input.title,
        description: input.description,
        url: input.url,
        ...(input.image && { image: input.image }),
        publisher: {
          '@type': 'Organization',
          name: this.defaultSiteName,
          url: this.baseUrl,
          logo: {
            '@type': 'ImageObject',
            url: `${this.baseUrl}/logo.png`,
          },
        },
      });
    }

    // Profile schema (for bio links)
    if (input.type === 'profile' && input.profileName) {
      jsonLdItems.push({
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: input.profileName,
          ...(input.profileUsername && { alternateName: input.profileUsername }),
          ...(input.profileBio && { description: input.profileBio }),
          ...(input.image && { image: input.image }),
          url: input.url,
        },
      });
    }

    // Product schema
    if (input.type === 'product' && input.productPrice) {
      jsonLdItems.push({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: input.title,
        description: input.description,
        ...(input.image && { image: input.image }),
        url: input.url,
        offers: {
          '@type': 'Offer',
          price: input.productPrice,
          priceCurrency: input.productCurrency || 'CNY',
          availability: input.productAvailability || 'https://schema.org/InStock',
        },
      });
    }

    // Breadcrumb schema
    jsonLdItems.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: this.baseUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: input.title,
          item: input.url,
        },
      ],
    });

    return jsonLdItems;
  }

  /**
   * Generate HTML meta tags string
   */
  generateHtmlMeta(seoData: PageSeoData): string {
    const lines: string[] = [];

    // Basic meta
    lines.push(`<title>${this.escapeHtml(seoData.meta.title)}</title>`);
    lines.push(`<meta name="description" content="${this.escapeHtml(seoData.meta.description)}">`);
    if (seoData.meta.keywords?.length) {
      lines.push(`<meta name="keywords" content="${this.escapeHtml(seoData.meta.keywords.join(', '))}">`);
    }
    if (seoData.meta.canonicalUrl) {
      lines.push(`<link rel="canonical" href="${seoData.meta.canonicalUrl}">`);
    }
    if (seoData.meta.robots) {
      lines.push(`<meta name="robots" content="${seoData.meta.robots}">`);
    }
    if (seoData.meta.author) {
      lines.push(`<meta name="author" content="${this.escapeHtml(seoData.meta.author)}">`);
    }
    if (seoData.meta.language) {
      lines.push(`<meta http-equiv="content-language" content="${seoData.meta.language}">`);
    }

    // Open Graph
    lines.push(`<meta property="og:title" content="${this.escapeHtml(seoData.openGraph.title)}">`);
    lines.push(`<meta property="og:description" content="${this.escapeHtml(seoData.openGraph.description)}">`);
    lines.push(`<meta property="og:type" content="${seoData.openGraph.type}">`);
    lines.push(`<meta property="og:url" content="${seoData.openGraph.url}">`);
    if (seoData.openGraph.image) {
      lines.push(`<meta property="og:image" content="${seoData.openGraph.image}">`);
      if (seoData.openGraph.imageWidth) {
        lines.push(`<meta property="og:image:width" content="${seoData.openGraph.imageWidth}">`);
      }
      if (seoData.openGraph.imageHeight) {
        lines.push(`<meta property="og:image:height" content="${seoData.openGraph.imageHeight}">`);
      }
    }
    if (seoData.openGraph.siteName) {
      lines.push(`<meta property="og:site_name" content="${this.escapeHtml(seoData.openGraph.siteName)}">`);
    }
    if (seoData.openGraph.locale) {
      lines.push(`<meta property="og:locale" content="${seoData.openGraph.locale}">`);
    }

    // Twitter Card
    lines.push(`<meta name="twitter:card" content="${seoData.twitterCard.card}">`);
    if (seoData.twitterCard.site) {
      lines.push(`<meta name="twitter:site" content="${seoData.twitterCard.site}">`);
    }
    if (seoData.twitterCard.creator) {
      lines.push(`<meta name="twitter:creator" content="${seoData.twitterCard.creator}">`);
    }
    lines.push(`<meta name="twitter:title" content="${this.escapeHtml(seoData.twitterCard.title)}">`);
    lines.push(`<meta name="twitter:description" content="${this.escapeHtml(seoData.twitterCard.description)}">`);
    if (seoData.twitterCard.image) {
      lines.push(`<meta name="twitter:image" content="${seoData.twitterCard.image}">`);
    }
    if (seoData.twitterCard.imageAlt) {
      lines.push(`<meta name="twitter:image:alt" content="${this.escapeHtml(seoData.twitterCard.imageAlt)}">`);
    }

    // JSON-LD
    for (const jsonLd of seoData.jsonLd) {
      lines.push(`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`);
    }

    return lines.join('\n');
  }

  /**
   * Generate sitemap entry
   */
  generateSitemapEntry(
    url: string,
    lastmod?: Date,
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never',
    priority?: number,
  ): string {
    const lines = ['<url>'];
    lines.push(`  <loc>${this.escapeXml(url)}</loc>`);
    if (lastmod) {
      lines.push(`  <lastmod>${lastmod.toISOString().split('T')[0]}</lastmod>`);
    }
    if (changefreq) {
      lines.push(`  <changefreq>${changefreq}</changefreq>`);
    }
    if (priority !== undefined) {
      lines.push(`  <priority>${priority.toFixed(1)}</priority>`);
    }
    lines.push('</url>');
    return lines.join('\n');
  }

  /**
   * Generate full sitemap XML
   */
  generateSitemap(entries: Array<{
    url: string;
    lastmod?: Date;
    changefreq?: string;
    priority?: number;
  }>): string {
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ];

    for (const entry of entries) {
      lines.push(this.generateSitemapEntry(
        entry.url,
        entry.lastmod,
        entry.changefreq as any,
        entry.priority,
      ));
    }

    lines.push('</urlset>');
    return lines.join('\n');
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(options?: {
    allowAll?: boolean;
    disallowPaths?: string[];
    sitemapUrl?: string;
  }): string {
    const lines: string[] = [];

    lines.push('User-agent: *');

    if (options?.allowAll !== false) {
      lines.push('Allow: /');
    }

    if (options?.disallowPaths?.length) {
      for (const path of options.disallowPaths) {
        lines.push(`Disallow: ${path}`);
      }
    }

    // Default disallowed paths
    lines.push('Disallow: /api/');
    lines.push('Disallow: /admin/');
    lines.push('Disallow: /dashboard/');

    if (options?.sitemapUrl) {
      lines.push('');
      lines.push(`Sitemap: ${options.sitemapUrl}`);
    }

    return lines.join('\n');
  }

  // ==================== Helper Methods ====================

  private truncate(text: string | undefined, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private generateDescription(input: SeoInput): string {
    if (input.type === 'profile' && input.profileBio) {
      return input.profileBio;
    }
    return `${input.title} - ${this.defaultSiteName}`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

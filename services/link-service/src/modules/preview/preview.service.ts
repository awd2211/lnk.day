import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';

import { LinkPreview } from './entities/link-preview.entity';
import { UpdatePreviewDto, PreviewResponseDto } from './dto/preview.dto';

interface FetchedMetadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  type?: string;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    imageWidth?: number;
    imageHeight?: number;
    url?: string;
    type?: string;
    siteName?: string;
    locale?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
    creator?: string;
  };
}

@Injectable()
export class PreviewService {
  private readonly logger = new Logger(PreviewService.name);
  private readonly userAgent: string;
  private readonly timeout: number;
  private readonly brandDomain: string;

  constructor(
    @InjectRepository(LinkPreview)
    private readonly previewRepository: Repository<LinkPreview>,
    private readonly configService: ConfigService,
  ) {
    this.brandDomain = this.configService.get('BRAND_DOMAIN', 'lnk.day');
    this.userAgent = this.configService.get(
      'PREVIEW_USER_AGENT',
      `Mozilla/5.0 (compatible; ${this.brandDomain}/1.0; +https://${this.brandDomain})`,
    );
    this.timeout = this.configService.get('PREVIEW_TIMEOUT', 10000);
  }

  async fetchPreview(url: string, linkId?: string, forceRefresh = false): Promise<PreviewResponseDto> {
    // 检查缓存
    if (!forceRefresh && linkId) {
      const cached = await this.previewRepository.findOne({
        where: { linkId },
      });
      if (cached && cached.isFetched) {
        // 缓存有效期 24 小时
        const cacheAge = Date.now() - (cached.lastFetchedAt?.getTime() || 0);
        if (cacheAge < 24 * 60 * 60 * 1000) {
          return this.toResponseDto(cached);
        }
      }
    }

    // 抓取元数据
    const metadata = await this.fetchMetadata(url);

    // 保存或更新预览
    if (linkId) {
      let preview = await this.previewRepository.findOne({
        where: { linkId },
      });

      if (preview) {
        Object.assign(preview, {
          ...metadata,
          isFetched: true,
          fetchError: undefined,
          lastFetchedAt: new Date(),
        });
      } else {
        preview = this.previewRepository.create({
          linkId,
          url,
          ...metadata,
          isFetched: true,
          lastFetchedAt: new Date(),
        });
      }

      await this.previewRepository.save(preview);
      return this.toResponseDto(preview);
    }

    return {
      url,
      ...metadata,
    };
  }

  async getPreview(linkId: string): Promise<LinkPreview | null> {
    return this.previewRepository.findOne({
      where: { linkId },
    });
  }

  async updatePreview(linkId: string, dto: UpdatePreviewDto): Promise<LinkPreview> {
    let preview = await this.previewRepository.findOne({
      where: { linkId },
    });

    if (!preview) {
      throw new NotFoundException('Preview not found for this link');
    }

    if (dto.title !== undefined) {
      preview.title = dto.title;
      preview.openGraph = { ...preview.openGraph, title: dto.title };
      preview.twitter = { ...preview.twitter, title: dto.title };
    }

    if (dto.description !== undefined) {
      preview.description = dto.description;
      preview.openGraph = { ...preview.openGraph, description: dto.description };
      preview.twitter = { ...preview.twitter, description: dto.description };
    }

    if (dto.image !== undefined) {
      preview.image = dto.image;
      preview.openGraph = { ...preview.openGraph, image: dto.image };
      preview.twitter = { ...preview.twitter, image: dto.image };
    }

    return this.previewRepository.save(preview);
  }

  async deletePreview(linkId: string): Promise<void> {
    await this.previewRepository.delete({ linkId });
  }

  private async fetchMetadata(url: string): Promise<FetchedMetadata> {
    const openGraph: FetchedMetadata['openGraph'] = {};
    const twitter: FetchedMetadata['twitter'] = {};

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // 基础元数据
      const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content');
      const description =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content');

      // Favicon
      let favicon =
        $('link[rel="icon"]').attr('href') ||
        $('link[rel="shortcut icon"]').attr('href') ||
        $('link[rel="apple-touch-icon"]').attr('href');

      if (favicon && !favicon.startsWith('http')) {
        const baseUrl = new URL(url);
        favicon = new URL(favicon, baseUrl.origin).href;
      }

      // Open Graph
      openGraph.title = $('meta[property="og:title"]').attr('content');
      openGraph.description = $('meta[property="og:description"]').attr('content');
      openGraph.image = $('meta[property="og:image"]').attr('content');
      openGraph.url = $('meta[property="og:url"]').attr('content');
      openGraph.type = $('meta[property="og:type"]').attr('content');
      openGraph.siteName = $('meta[property="og:site_name"]').attr('content');
      openGraph.locale = $('meta[property="og:locale"]').attr('content');

      const ogImageWidth = $('meta[property="og:image:width"]').attr('content');
      const ogImageHeight = $('meta[property="og:image:height"]').attr('content');
      if (ogImageWidth) openGraph.imageWidth = parseInt(ogImageWidth, 10);
      if (ogImageHeight) openGraph.imageHeight = parseInt(ogImageHeight, 10);

      // Twitter Card
      twitter.card = $('meta[name="twitter:card"]').attr('content');
      twitter.title = $('meta[name="twitter:title"]').attr('content');
      twitter.description = $('meta[name="twitter:description"]').attr('content');
      twitter.image = $('meta[name="twitter:image"]').attr('content');
      twitter.site = $('meta[name="twitter:site"]').attr('content');
      twitter.creator = $('meta[name="twitter:creator"]').attr('content');

      // 合并最终结果
      const finalImage = openGraph.image || twitter.image || this.findFirstImage($);

      return {
        title: title || undefined,
        description: description || undefined,
        image: finalImage ? this.resolveUrl(finalImage, url) : undefined,
        favicon,
        siteName: openGraph.siteName,
        type: openGraph.type || 'website',
        openGraph,
        twitter,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch metadata for ${url}: ${error.message}`);
      return {
        openGraph,
        twitter,
      };
    }
  }

  private findFirstImage($: cheerio.CheerioAPI): string | undefined {
    // 尝试找到页面中的第一个合适的图片
    const img = $('article img, main img, .content img, img').first();
    const src = img.attr('src') || img.attr('data-src');
    return src || undefined;
  }

  private resolveUrl(path: string, baseUrl: string): string {
    if (path.startsWith('http')) {
      return path;
    }
    try {
      const base = new URL(baseUrl);
      return new URL(path, base.origin).href;
    } catch {
      return path;
    }
  }

  private toResponseDto(preview: LinkPreview): PreviewResponseDto {
    return {
      url: preview.url,
      title: preview.title,
      description: preview.description,
      image: preview.image,
      favicon: preview.favicon,
      siteName: preview.siteName,
      type: preview.type,
      openGraph: preview.openGraph || {},
      twitter: preview.twitter || {},
    };
  }
}

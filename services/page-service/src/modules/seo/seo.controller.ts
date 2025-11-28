import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';

import { SeoService, SeoInput, PageSeoData } from './seo.service';
import { BioLinkService } from '../bio-link/bio-link.service';
import { PageService } from '../page/page.service';

@ApiTags('seo')
@Controller('seo')
export class SeoController {
  constructor(
    private readonly seoService: SeoService,
    private readonly bioLinkService: BioLinkService,
    private readonly pageService: PageService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: '生成SEO数据' })
  async generateSeo(@Body() input: SeoInput): Promise<PageSeoData> {
    return this.seoService.generateSeoData(input);
  }

  @Post('generate-html')
  @ApiOperation({ summary: '生成HTML meta标签' })
  @ApiResponse({ status: 200, type: String })
  async generateHtmlMeta(@Body() input: SeoInput): Promise<{ html: string }> {
    const seoData = this.seoService.generateSeoData(input);
    const html = this.seoService.generateHtmlMeta(seoData);
    return { html };
  }

  @Get('sitemap.xml')
  @ApiOperation({ summary: '获取站点地图' })
  @Header('Content-Type', 'application/xml')
  async getSitemap(@Res() res: Response) {
    const baseUrl = process.env.BASE_URL || 'https://lnk.day';

    // Get all published pages
    const { items: pages } = await this.pageService.findAll(undefined, { status: 'published' });
    const { items: bioLinks } = await this.bioLinkService.findAll('', {
      status: 'published' as any,
      limit: 10000,
    });

    const entries = [
      // Homepage
      {
        url: baseUrl,
        changefreq: 'daily',
        priority: 1.0,
      },
      // Bio links
      ...bioLinks.map((bioLink) => ({
        url: `${baseUrl}/u/${bioLink.username}`,
        lastmod: bioLink.updatedAt,
        changefreq: 'weekly' as const,
        priority: 0.8,
      })),
      // Pages
      ...pages.map((page) => ({
        url: `${baseUrl}/p/${page.slug}`,
        lastmod: page.updatedAt,
        changefreq: 'weekly' as const,
        priority: 0.7,
      })),
    ];

    const sitemap = this.seoService.generateSitemap(entries);
    res.send(sitemap);
  }

  @Get('robots.txt')
  @ApiOperation({ summary: '获取robots.txt' })
  @Header('Content-Type', 'text/plain')
  async getRobotsTxt(@Res() res: Response) {
    const baseUrl = process.env.BASE_URL || 'https://lnk.day';
    const robotsTxt = this.seoService.generateRobotsTxt({
      allowAll: true,
      sitemapUrl: `${baseUrl}/seo/sitemap.xml`,
      disallowPaths: [
        '/api/',
        '/admin/',
        '/dashboard/',
        '/internal/',
      ],
    });
    res.send(robotsTxt);
  }
}

// SEO Preview Controller - generates preview data for link sharing
@ApiTags('seo-preview')
@Controller()
export class SeoPreviewController {
  constructor(
    private readonly seoService: SeoService,
    private readonly bioLinkService: BioLinkService,
    private readonly pageService: PageService,
  ) {}

  @Get('u/:username/seo')
  @ApiOperation({ summary: '获取Bio Link的SEO数据' })
  async getBioLinkSeo(@Query('username') username: string): Promise<PageSeoData> {
    const bioLink = await this.bioLinkService.findByUsername(username);
    const baseUrl = process.env.BASE_URL || 'https://lnk.day';

    const input: SeoInput = {
      title: bioLink.seo?.title || `${bioLink.profile.name} | Links`,
      description: bioLink.seo?.description || bioLink.profile.bio,
      keywords: bioLink.seo?.keywords,
      image: bioLink.seo?.ogImage || bioLink.profile.avatarUrl,
      url: `${baseUrl}/u/${bioLink.username}`,
      type: 'profile',
      profileName: bioLink.profile.name,
      profileUsername: bioLink.username,
      profileBio: bioLink.profile.bio,
    };

    return this.seoService.generateSeoData(input);
  }

  @Get('p/:slug/seo')
  @ApiOperation({ summary: '获取页面的SEO数据' })
  async getPageSeo(@Query('slug') slug: string): Promise<PageSeoData> {
    const page = await this.pageService.findBySlug(slug);
    const baseUrl = process.env.BASE_URL || 'https://lnk.day';

    const input: SeoInput = {
      title: page.seo?.title || page.name,
      description: page.seo?.description,
      keywords: page.seo?.keywords,
      image: page.seo?.ogImage || page.thumbnailUrl,
      url: `${baseUrl}/p/${page.slug}`,
      type: 'website',
      publishedAt: page.publishedAt,
      updatedAt: page.updatedAt,
    };

    return this.seoService.generateSeoData(input);
  }
}

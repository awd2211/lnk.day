import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page, PageStatus, PageBlock, ABTestConfig, ABTestVariant } from './entities/page.entity';

@Injectable()
export class PageService {
  constructor(
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
  ) {}

  async create(data: Partial<Page>): Promise<Page> {
    if (data.slug) {
      const existing = await this.pageRepository.findOne({ where: { slug: data.slug } });
      if (existing) throw new ConflictException('Slug already exists');
    } else {
      data.slug = await this.generateUniqueSlug(data.name || 'page');
    }

    const page = this.pageRepository.create(data);
    return this.pageRepository.save(page);
  }

  async findAll(
    teamId?: string,
    options?: { status?: PageStatus | string; page?: number; limit?: number },
  ): Promise<{ items: Page[]; total: number }> {
    const where: any = {};
    if (teamId) where.teamId = teamId;
    if (options?.status) where.status = options.status;

    const page = options?.page || 1;
    const limit = options?.limit || 50;

    const [items, total] = await this.pageRepository.findAndCount({
      where,
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async findOne(id: string): Promise<Page> {
    const page = await this.pageRepository.findOne({ where: { id } });
    if (!page) throw new NotFoundException(`Page ${id} not found`);
    return page;
  }

  async findBySlug(slug: string): Promise<Page> {
    const page = await this.pageRepository.findOne({
      where: { slug, status: PageStatus.PUBLISHED },
    });
    if (!page) throw new NotFoundException(`Page not found`);
    return page;
  }

  async update(id: string, data: Partial<Page>): Promise<Page> {
    const page = await this.findOne(id);

    if (data.slug && data.slug !== page.slug) {
      const existing = await this.pageRepository.findOne({ where: { slug: data.slug } });
      if (existing) throw new ConflictException('Slug already exists');
    }

    Object.assign(page, data);
    return this.pageRepository.save(page);
  }

  async publish(id: string): Promise<Page> {
    const page = await this.findOne(id);
    page.status = PageStatus.PUBLISHED;
    page.publishedAt = new Date();
    return this.pageRepository.save(page);
  }

  async unpublish(id: string): Promise<Page> {
    const page = await this.findOne(id);
    page.status = PageStatus.DRAFT;
    return this.pageRepository.save(page);
  }

  async archive(id: string): Promise<Page> {
    const page = await this.findOne(id);
    page.status = PageStatus.ARCHIVED;
    return this.pageRepository.save(page);
  }

  async remove(id: string): Promise<void> {
    const page = await this.findOne(id);
    await this.pageRepository.remove(page);
  }

  async duplicate(id: string, userId: string, teamId: string): Promise<Page> {
    const original = await this.findOne(id);
    const newSlug = await this.generateUniqueSlug(`${original.name}-copy`);

    const duplicateData: Partial<Page> = {
      name: `${original.name} (Copy)`,
      slug: newSlug,
      userId,
      teamId,
      type: original.type,
      status: PageStatus.DRAFT,
      blocks: original.blocks,
      theme: original.theme,
      seo: original.seo,
      settings: original.settings,
      views: 0,
      uniqueViews: 0,
    };

    const duplicate = this.pageRepository.create(duplicateData);
    return this.pageRepository.save(duplicate);
  }

  async updateBlocks(id: string, blocks: PageBlock[]): Promise<Page> {
    const page = await this.findOne(id);
    page.blocks = blocks;
    return this.pageRepository.save(page);
  }

  async incrementViews(id: string): Promise<void> {
    await this.pageRepository.increment({ id }, 'views', 1);
  }

  async incrementUniqueViews(id: string): Promise<void> {
    await this.pageRepository.increment({ id }, 'uniqueViews', 1);
  }

  async getAnalytics(
    id: string,
    params?: { startDate?: string; endDate?: string },
  ): Promise<{
    views: number;
    uniqueViews: number;
    period: { startDate: string; endDate: string };
  }> {
    const page = await this.findOne(id);
    // 基础分析数据，未来可以从 analytics-service 获取更详细的数据
    const endDate: string = params?.endDate || new Date().toISOString().split('T')[0] as string;
    const startDate: string = params?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] as string;

    return {
      views: page.views || 0,
      uniqueViews: page.uniqueViews || 0,
      period: { startDate, endDate },
    };
  }

  async renderPage(slug: string, variantId?: string): Promise<{ html: string; variantId?: string }> {
    const page = await this.findBySlug(slug);

    // Check for A/B test
    const abTest = page.settings?.abTest;
    let selectedVariant: ABTestVariant | null = null;

    if (abTest?.isEnabled && abTest.variants?.length > 0) {
      // If specific variant requested, use it
      if (variantId) {
        selectedVariant = abTest.variants.find(v => v.id === variantId) || null;
      } else {
        // Select variant based on traffic percentage
        selectedVariant = this.selectABTestVariant(abTest);
      }
    }

    return {
      html: this.generateHtml(page, selectedVariant),
      variantId: selectedVariant?.id,
    };
  }

  // A/B Test: Select variant based on traffic distribution
  private selectABTestVariant(abTest: ABTestConfig): ABTestVariant | null {
    const variants = abTest.variants || [];
    if (variants.length === 0) return null;

    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.trafficPercentage;
      if (random <= cumulative) {
        return variant;
      }
    }

    // Fallback to control variant or first variant
    return variants.find(v => v.isControl) || variants[0] || null;
  }

  // A/B Test: Update test configuration
  async updateABTest(id: string, abTestConfig: ABTestConfig): Promise<Page> {
    const page = await this.findOne(id);

    // Validate traffic percentages sum to 100%
    const totalPercentage = abTestConfig.variants.reduce(
      (sum, v) => sum + v.trafficPercentage,
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new ConflictException('Traffic percentages must sum to 100%');
    }

    page.settings = {
      ...page.settings,
      abTest: abTestConfig,
    };

    return this.pageRepository.save(page);
  }

  // A/B Test: Get test results
  async getABTestResults(id: string): Promise<{
    variants: Array<{
      id: string;
      name: string;
      trafficPercentage: number;
      views: number;
      clicks: number;
      conversionRate: number;
    }>;
  }> {
    const page = await this.findOne(id);
    const abTest = page.settings?.abTest;

    if (!abTest?.isEnabled) {
      return { variants: [] };
    }

    // In a real implementation, this would fetch data from analytics service
    // For now, return mock data structure
    return {
      variants: abTest.variants.map(v => ({
        id: v.id,
        name: v.name,
        trafficPercentage: v.trafficPercentage,
        views: 0,  // Would come from analytics
        clicks: 0,  // Would come from analytics
        conversionRate: 0,  // Would be calculated
      })),
    };
  }

  // A/B Test: Declare winner and apply variant
  async declareABTestWinner(id: string, winnerVariantId: string): Promise<Page> {
    const page = await this.findOne(id);
    const abTest = page.settings?.abTest;

    if (!abTest?.isEnabled) {
      throw new ConflictException('No active A/B test');
    }

    const winner = abTest.variants.find(v => v.id === winnerVariantId);
    if (!winner) {
      throw new NotFoundException('Variant not found');
    }

    // Apply winner's changes to main page
    if (winner.theme) {
      page.theme = { ...page.theme, ...winner.theme };
    }
    if (winner.blocks) {
      page.blocks = winner.blocks;
    }

    // Disable A/B test and record winner
    page.settings = {
      ...page.settings,
      abTest: {
        ...abTest,
        isEnabled: false,
        winnerVariantId,
      },
    };

    return this.pageRepository.save(page);
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await this.pageRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private generateHtml(page: Page, variant?: ABTestVariant | null): string {
    // Apply variant theme/blocks if present
    const theme = variant?.theme
      ? { ...page.theme, ...variant.theme }
      : page.theme || {};
    const blocks = variant?.blocks || page.blocks;
    const seo = page.seo || {};

    const styles = `
      :root {
        --primary-color: ${theme.primaryColor || '#3b82f6'};
        --secondary-color: ${theme.secondaryColor || '#1e40af'};
        --background-color: ${theme.backgroundColor || '#ffffff'};
        --text-color: ${theme.textColor || '#1f2937'};
        --border-radius: ${theme.borderRadius || '8px'};
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: ${theme.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
        background-color: var(--background-color);
        color: var(--text-color);
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem 1rem;
      }
      .container { max-width: 600px; width: 100%; }
      .block { margin-bottom: 1.5rem; }
      .btn {
        display: block;
        width: 100%;
        padding: 1rem;
        border-radius: var(--border-radius);
        text-decoration: none;
        text-align: center;
        font-weight: 500;
        transition: transform 0.2s, opacity 0.2s;
      }
      .btn:hover { transform: translateY(-2px); opacity: 0.9; }
      .btn-filled { background: var(--primary-color); color: white; border: none; }
      .btn-outlined { background: transparent; border: 2px solid var(--primary-color); color: var(--primary-color); }
      h1, h2, h3 { margin-bottom: 0.5rem; }
      img { max-width: 100%; border-radius: var(--border-radius); }
      ${page.settings?.customCss || ''}
    `;

    const blocksHtml = (blocks || [])
      .sort((a, b) => a.order - b.order)
      .map((block) => this.renderBlock(block, theme))
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seo.title || page.name}</title>
  <meta name="description" content="${seo.description || ''}">
  ${seo.ogImage ? `<meta property="og:image" content="${seo.ogImage}">` : ''}
  ${seo.favicon ? `<link rel="icon" href="${seo.favicon}">` : ''}
  ${seo.noIndex ? '<meta name="robots" content="noindex">' : ''}
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    ${blocksHtml}
  </div>
  ${page.settings?.customJs ? `<script>${page.settings.customJs}</script>` : ''}
</body>
</html>`;
  }

  private renderBlock(block: PageBlock, theme: any): string {
    const buttonStyle = theme.buttonStyle || 'filled';

    switch (block.type) {
      case 'header':
        return `<div class="block"><h1>${block.content.text || ''}</h1></div>`;
      case 'text':
        return `<div class="block"><p>${block.content.text || ''}</p></div>`;
      case 'image':
        return `<div class="block"><img src="${block.content.url || ''}" alt="${block.content.alt || ''}"></div>`;
      case 'button':
        return `<div class="block"><a href="${block.content.url || '#'}" class="btn btn-${buttonStyle}">${block.content.text || 'Click'}</a></div>`;
      case 'links':
        const links = (block.content.links || [])
          .map((l: any) => `<a href="${l.url}" class="btn btn-${buttonStyle}">${l.text}</a>`)
          .join('\n');
        return `<div class="block">${links}</div>`;
      case 'divider':
        return `<div class="block"><hr style="border: 1px solid #e5e7eb;"></div>`;
      case 'html':
        return `<div class="block">${block.content.html || ''}</div>`;
      case 'carousel':
        return this.renderCarousel(block);
      case 'countdown':
        return this.renderCountdown(block);
      case 'music':
        return this.renderMusic(block);
      case 'map':
        return this.renderMap(block);
      case 'subscribe':
        return this.renderSubscribe(block);
      case 'nft':
        return this.renderNft(block);
      case 'podcast':
        return this.renderPodcast(block);
      case 'product':
        return this.renderProduct(block, buttonStyle);
      default:
        return '';
    }
  }

  private renderCarousel(block: PageBlock): string {
    const { images = [], autoPlay = true, interval = 5000, showDots = true, showArrows = true } = block.content;
    const carouselId = `carousel-${block.id}`;

    const slides = images
      .map(
        (img: any, i: number) => `
      <div class="carousel-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
        ${img.link ? `<a href="${img.link}">` : ''}
        <img src="${img.url}" alt="${img.alt || ''}" />
        ${img.link ? '</a>' : ''}
      </div>
    `,
      )
      .join('');

    const dots = showDots
      ? `<div class="carousel-dots">
        ${images.map((_: any, i: number) => `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}
      </div>`
      : '';

    const arrows = showArrows
      ? `
      <button class="carousel-arrow carousel-prev">&lt;</button>
      <button class="carousel-arrow carousel-next">&gt;</button>
    `
      : '';

    return `
      <div class="block carousel" id="${carouselId}" data-autoplay="${autoPlay}" data-interval="${interval}">
        <div class="carousel-inner">${slides}</div>
        ${arrows}
        ${dots}
      </div>
      <style>
        .carousel { position: relative; overflow: hidden; border-radius: var(--border-radius); }
        .carousel-inner { display: flex; transition: transform 0.5s ease; }
        .carousel-slide { min-width: 100%; }
        .carousel-slide img { width: 100%; display: block; }
        .carousel-arrow { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; padding: 1rem; cursor: pointer; z-index: 10; }
        .carousel-prev { left: 0; }
        .carousel-next { right: 0; }
        .carousel-dots { position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%); display: flex; gap: 0.5rem; }
        .dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.5); cursor: pointer; }
        .dot.active { background: white; }
      </style>
      <script>
        (function() {
          const carousel = document.getElementById('${carouselId}');
          const inner = carousel.querySelector('.carousel-inner');
          const slides = carousel.querySelectorAll('.carousel-slide');
          const dots = carousel.querySelectorAll('.dot');
          let current = 0;
          const total = slides.length;

          function goTo(index) {
            current = (index + total) % total;
            inner.style.transform = 'translateX(-' + (current * 100) + '%)';
            dots.forEach((d, i) => d.classList.toggle('active', i === current));
          }

          carousel.querySelector('.carousel-prev')?.addEventListener('click', () => goTo(current - 1));
          carousel.querySelector('.carousel-next')?.addEventListener('click', () => goTo(current + 1));
          dots.forEach(dot => dot.addEventListener('click', (e) => goTo(parseInt(e.target.dataset.index))));

          if (carousel.dataset.autoplay === 'true') {
            setInterval(() => goTo(current + 1), parseInt(carousel.dataset.interval));
          }
        })();
      </script>
    `;
  }

  private renderCountdown(block: PageBlock): string {
    const {
      targetDate,
      title = '',
      expiredMessage = 'Event has ended',
      showDays = true,
      showHours = true,
      showMinutes = true,
      showSeconds = true,
    } = block.content;

    const countdownId = `countdown-${block.id}`;

    return `
      <div class="block countdown" id="${countdownId}" data-target="${targetDate}">
        ${title ? `<h3 class="countdown-title">${title}</h3>` : ''}
        <div class="countdown-timer">
          ${showDays ? '<div class="countdown-unit"><span class="countdown-value" data-unit="days">00</span><span class="countdown-label">Days</span></div>' : ''}
          ${showHours ? '<div class="countdown-unit"><span class="countdown-value" data-unit="hours">00</span><span class="countdown-label">Hours</span></div>' : ''}
          ${showMinutes ? '<div class="countdown-unit"><span class="countdown-value" data-unit="minutes">00</span><span class="countdown-label">Minutes</span></div>' : ''}
          ${showSeconds ? '<div class="countdown-unit"><span class="countdown-value" data-unit="seconds">00</span><span class="countdown-label">Seconds</span></div>' : ''}
        </div>
        <div class="countdown-expired" style="display:none;">${expiredMessage}</div>
      </div>
      <style>
        .countdown { text-align: center; padding: 1.5rem; background: var(--primary-color); color: white; border-radius: var(--border-radius); }
        .countdown-title { margin-bottom: 1rem; }
        .countdown-timer { display: flex; justify-content: center; gap: 1rem; }
        .countdown-unit { display: flex; flex-direction: column; }
        .countdown-value { font-size: 2.5rem; font-weight: bold; }
        .countdown-label { font-size: 0.75rem; text-transform: uppercase; opacity: 0.8; }
        .countdown-expired { font-size: 1.25rem; font-weight: 500; }
      </style>
      <script>
        (function() {
          const countdown = document.getElementById('${countdownId}');
          const target = new Date(countdown.dataset.target).getTime();

          function update() {
            const now = Date.now();
            const diff = target - now;

            if (diff <= 0) {
              countdown.querySelector('.countdown-timer').style.display = 'none';
              countdown.querySelector('.countdown-expired').style.display = 'block';
              return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const daysEl = countdown.querySelector('[data-unit="days"]');
            const hoursEl = countdown.querySelector('[data-unit="hours"]');
            const minutesEl = countdown.querySelector('[data-unit="minutes"]');
            const secondsEl = countdown.querySelector('[data-unit="seconds"]');

            if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
            if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
            if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
            if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
          }

          update();
          setInterval(update, 1000);
        })();
      </script>
    `;
  }

  private renderMusic(block: PageBlock): string {
    const { platform, embedUrl, trackId, playlistId, compact = false } = block.content;
    const height = compact ? 80 : 352;

    let src = embedUrl;
    if (!src && platform === 'spotify') {
      if (trackId) src = `https://open.spotify.com/embed/track/${trackId}`;
      else if (playlistId) src = `https://open.spotify.com/embed/playlist/${playlistId}`;
    } else if (!src && platform === 'soundcloud') {
      src = `https://w.soundcloud.com/player/?url=${trackId || ''}&color=%23ff5500&auto_play=false`;
    }

    if (!src) return '<div class="block">Music embed URL not configured</div>';

    return `
      <div class="block music-embed">
        <iframe
          src="${src}"
          width="100%"
          height="${height}"
          frameBorder="0"
          allowfullscreen=""
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style="border-radius: var(--border-radius);"
        ></iframe>
      </div>
    `;
  }

  private renderMap(block: PageBlock): string {
    const { platform, latitude, longitude, zoom = 14, address, height = 300 } = block.content;

    let mapHtml = '';
    if (platform === 'google') {
      const query = address ? encodeURIComponent(address) : `${latitude},${longitude}`;
      mapHtml = `<iframe
        src="https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${query}&zoom=${zoom}"
        width="100%" height="${height}" style="border:0; border-radius: var(--border-radius);"
        allowfullscreen="" loading="lazy">
      </iframe>`;
    } else if (platform === 'openstreetmap') {
      mapHtml = `<iframe
        src="https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}"
        width="100%" height="${height}" style="border:0; border-radius: var(--border-radius);"
        loading="lazy">
      </iframe>`;
    }

    return `
      <div class="block map-embed">
        ${mapHtml}
        ${address ? `<p class="map-address" style="margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280;">${address}</p>` : ''}
      </div>
    `;
  }

  private renderSubscribe(block: PageBlock): string {
    const {
      webhookUrl,
      title = 'Subscribe to our newsletter',
      description = '',
      buttonText = 'Subscribe',
      successMessage = 'Thanks for subscribing!',
      collectName = false,
      collectPhone = false,
    } = block.content;

    const formId = `subscribe-${block.id}`;

    return `
      <div class="block subscribe-form" id="${formId}">
        <form class="subscribe-inner">
          ${title ? `<h3>${title}</h3>` : ''}
          ${description ? `<p style="margin-bottom: 1rem; opacity: 0.8;">${description}</p>` : ''}
          ${collectName ? `<input type="text" name="name" placeholder="Your name" class="subscribe-input" required>` : ''}
          <input type="email" name="email" placeholder="Your email" class="subscribe-input" required>
          ${collectPhone ? `<input type="tel" name="phone" placeholder="Phone number" class="subscribe-input">` : ''}
          <button type="submit" class="btn btn-filled subscribe-btn">${buttonText}</button>
          <div class="subscribe-success" style="display:none;">${successMessage}</div>
          <div class="subscribe-error" style="display:none; color: #ef4444;">Something went wrong. Please try again.</div>
        </form>
      </div>
      <style>
        .subscribe-inner { padding: 1.5rem; background: #f9fafb; border-radius: var(--border-radius); }
        .subscribe-input { width: 100%; padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: var(--border-radius); margin-bottom: 0.75rem; font-size: 1rem; }
        .subscribe-input:focus { outline: none; border-color: var(--primary-color); }
        .subscribe-btn { width: 100%; }
        .subscribe-success { padding: 1rem; background: #d1fae5; color: #065f46; border-radius: var(--border-radius); margin-top: 1rem; }
      </style>
      <script>
        (function() {
          const form = document.querySelector('#${formId} form');
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
              const webhookUrl = '${webhookUrl || ''}';
              if (webhookUrl) {
                await fetch(webhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
              }
              form.querySelector('.subscribe-success').style.display = 'block';
              form.querySelector('.subscribe-error').style.display = 'none';
              form.reset();
            } catch (err) {
              form.querySelector('.subscribe-error').style.display = 'block';
            }
          });
        })();
      </script>
    `;
  }

  private renderNft(block: PageBlock): string {
    const { platform, contractAddress, tokenId, collectionSlug, showPrice = true, displayMode = 'single' } = block.content;

    if (platform === 'opensea' && collectionSlug) {
      return `
        <div class="block nft-embed">
          <iframe
            src="https://opensea.io/collection/${collectionSlug}?embed=true"
            width="100%"
            height="400"
            frameborder="0"
            style="border-radius: var(--border-radius);"
            loading="lazy"
          ></iframe>
        </div>
      `;
    }

    if (platform === 'opensea' && contractAddress && tokenId) {
      return `
        <div class="block nft-embed">
          <nft-card
            contractAddress="${contractAddress}"
            tokenId="${tokenId}">
          </nft-card>
          <script src="https://unpkg.com/embeddable-nfts/dist/nft-card.min.js"></script>
        </div>
      `;
    }

    return `<div class="block nft-placeholder" style="padding: 2rem; background: #f3f4f6; border-radius: var(--border-radius); text-align: center;">
      <p>NFT configuration incomplete</p>
    </div>`;
  }

  private renderPodcast(block: PageBlock): string {
    const { platform, showId, episodeId, embedUrl } = block.content;

    let src = embedUrl;
    if (!src && platform === 'spotify') {
      if (episodeId) src = `https://open.spotify.com/embed/episode/${episodeId}`;
      else if (showId) src = `https://open.spotify.com/embed/show/${showId}`;
    } else if (!src && platform === 'apple' && showId) {
      src = `https://embed.podcasts.apple.com/podcast/id${showId}`;
    }

    if (!src) return '<div class="block">Podcast embed URL not configured</div>';

    return `
      <div class="block podcast-embed">
        <iframe
          src="${src}"
          width="100%"
          height="232"
          frameBorder="0"
          allowfullscreen=""
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style="border-radius: var(--border-radius);"
        ></iframe>
      </div>
    `;
  }

  private renderProduct(block: PageBlock, buttonStyle: string): string {
    const { name, description, price, currency = 'USD', imageUrl, buyUrl, originalPrice, badge, variants = [] } = block.content;

    const priceDisplay = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
    const originalPriceDisplay = originalPrice
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(originalPrice)
      : null;

    const variantsHtml = variants.length
      ? `<div class="product-variants">
        ${variants.map((v: any) => `<button class="variant-btn">${v.name}</button>`).join('')}
      </div>`
      : '';

    return `
      <div class="block product-card">
        ${badge ? `<span class="product-badge">${badge}</span>` : ''}
        ${imageUrl ? `<img src="${imageUrl}" alt="${name}" class="product-image">` : ''}
        <div class="product-info">
          <h3 class="product-name">${name}</h3>
          ${description ? `<p class="product-description">${description}</p>` : ''}
          <div class="product-price">
            <span class="current-price">${priceDisplay}</span>
            ${originalPriceDisplay ? `<span class="original-price">${originalPriceDisplay}</span>` : ''}
          </div>
          ${variantsHtml}
          ${buyUrl ? `<a href="${buyUrl}" class="btn btn-${buttonStyle} product-buy">Buy Now</a>` : ''}
        </div>
      </div>
      <style>
        .product-card { position: relative; background: white; border: 1px solid #e5e7eb; border-radius: var(--border-radius); overflow: hidden; }
        .product-badge { position: absolute; top: 0.75rem; left: 0.75rem; background: var(--primary-color); color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; z-index: 1; }
        .product-image { width: 100%; aspect-ratio: 1; object-fit: cover; }
        .product-info { padding: 1rem; }
        .product-name { margin-bottom: 0.5rem; }
        .product-description { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.75rem; }
        .product-price { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
        .current-price { font-size: 1.25rem; font-weight: 700; color: var(--primary-color); }
        .original-price { font-size: 1rem; color: #9ca3af; text-decoration: line-through; }
        .product-variants { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
        .variant-btn { padding: 0.5rem 1rem; border: 1px solid #e5e7eb; border-radius: var(--border-radius); background: white; cursor: pointer; }
        .variant-btn:hover { border-color: var(--primary-color); }
        .product-buy { margin-top: 0.5rem; }
      </style>
    `;
  }

  /**
   * Get platform-wide page statistics (for admin console)
   */
  async getGlobalStats(): Promise<{
    totalPages: number;
    publishedPages: number;
    draftPages: number;
    archivedPages: number;
    totalViews: number;
    totalUniqueViews: number;
  }> {
    const [
      totalPages,
      publishedPages,
      draftPages,
      archivedPages,
    ] = await Promise.all([
      this.pageRepository.count(),
      this.pageRepository.count({ where: { status: PageStatus.PUBLISHED } }),
      this.pageRepository.count({ where: { status: PageStatus.DRAFT } }),
      this.pageRepository.count({ where: { status: PageStatus.ARCHIVED } }),
    ]);

    // Get aggregated view stats
    const aggregateResult = await this.pageRepository
      .createQueryBuilder('page')
      .select('SUM(page.views)', 'totalViews')
      .addSelect('SUM(page.uniqueViews)', 'totalUniqueViews')
      .getRawOne();

    return {
      totalPages,
      publishedPages,
      draftPages,
      archivedPages,
      totalViews: parseInt(aggregateResult?.totalViews || '0', 10),
      totalUniqueViews: parseInt(aggregateResult?.totalUniqueViews || '0', 10),
    };
  }
}

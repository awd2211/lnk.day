import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page, PageStatus, PageBlock } from './entities/page.entity';

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

  async findAll(teamId: string, options?: { status?: PageStatus }): Promise<Page[]> {
    const where: any = { teamId };
    if (options?.status) where.status = options.status;

    return this.pageRepository.find({
      where,
      order: { updatedAt: 'DESC' },
    });
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

  async renderPage(slug: string): Promise<string> {
    const page = await this.findBySlug(slug);
    return this.generateHtml(page);
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

  private generateHtml(page: Page): string {
    const theme = page.theme || {};
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

    const blocksHtml = (page.blocks || [])
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
      default:
        return '';
    }
  }
}

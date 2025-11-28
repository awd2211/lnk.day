import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, Index, SearchParams, SearchResponse } from 'meilisearch';

import { Link } from '../link/entities/link.entity';

export interface LinkDocument {
  id: string;
  shortCode: string;
  originalUrl: string;
  title: string;
  description: string;
  domain: string;
  teamId: string;
  userId: string;
  tags: string[];
  status: string;
  totalClicks: number;
  createdAt: number;
  updatedAt: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private client: MeiliSearch;
  private index: Index<LinkDocument>;
  private readonly logger = new Logger(SearchService.name);
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get('MEILISEARCH_HOST', 'http://localhost:60035');
    const apiKey = this.configService.get('MEILISEARCH_API_KEY', 'meilisearch-master-key-change-in-production');

    this.client = new MeiliSearch({
      host,
      apiKey,
    });
  }

  async onModuleInit() {
    // Run initialization in background to not block app startup
    this.initializeAsync();
  }

  private async initializeAsync() {
    const timeout = 5000; // 5 second timeout

    try {
      // Test connection first with timeout
      const healthPromise = this.client.health();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), timeout)
      );

      await Promise.race([healthPromise, timeoutPromise]);

      // Create or get the index
      await this.client.createIndex('links', { primaryKey: 'id' });
      this.index = this.client.index('links');

      // Configure searchable attributes
      await this.index.updateSearchableAttributes([
        'title',
        'description',
        'originalUrl',
        'shortCode',
        'tags',
      ]);

      // Configure filterable attributes
      await this.index.updateFilterableAttributes([
        'teamId',
        'userId',
        'domain',
        'status',
        'tags',
        'totalClicks',
        'createdAt',
      ]);

      // Configure sortable attributes
      await this.index.updateSortableAttributes([
        'totalClicks',
        'createdAt',
        'updatedAt',
      ]);

      this.initialized = true;
      this.logger.log('Meilisearch index initialized');
    } catch (error: any) {
      this.logger.warn(`Failed to initialize Meilisearch: ${error.message}. Search functionality will be unavailable.`);
    }
  }

  async indexLink(link: Link): Promise<void> {
    if (!this.initialized) return;

    try {
      const document: LinkDocument = {
        id: link.id,
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        title: link.title || '',
        description: link.description || '',
        domain: link.domain,
        teamId: link.teamId,
        userId: link.userId,
        tags: link.tags || [],
        status: link.status,
        totalClicks: link.totalClicks,
        createdAt: new Date(link.createdAt).getTime(),
        updatedAt: new Date(link.updatedAt).getTime(),
      };

      await this.index.addDocuments([document]);
    } catch (error: any) {
      this.logger.error(`Failed to index link ${link.id}: ${error.message}`);
    }
  }

  async updateLink(link: Link): Promise<void> {
    await this.indexLink(link);
  }

  async deleteLink(linkId: string): Promise<void> {
    if (!this.initialized) return;

    try {
      await this.index.deleteDocument(linkId);
    } catch (error: any) {
      this.logger.error(`Failed to delete link ${linkId} from index: ${error.message}`);
    }
  }

  async search(
    teamId: string,
    query: string,
    options?: {
      filters?: {
        domains?: string[];
        tags?: string[];
        status?: string[];
        minClicks?: number;
        maxClicks?: number;
        startDate?: Date;
        endDate?: Date;
      };
      sort?: { field: string; order: 'asc' | 'desc' };
      page?: number;
      limit?: number;
    },
  ): Promise<{
    hits: LinkDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    if (!this.initialized) {
      return { hits: [], total: 0, page: 1, totalPages: 0 };
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;

    // Build filter string
    const filterParts: string[] = [`teamId = "${teamId}"`];

    if (options?.filters) {
      const { domains, tags, status, minClicks, maxClicks, startDate, endDate } = options.filters;

      if (domains && domains.length > 0) {
        filterParts.push(`domain IN [${domains.map((d) => `"${d}"`).join(', ')}]`);
      }

      if (tags && tags.length > 0) {
        filterParts.push(`tags IN [${tags.map((t) => `"${t}"`).join(', ')}]`);
      }

      if (status && status.length > 0) {
        filterParts.push(`status IN [${status.map((s) => `"${s}"`).join(', ')}]`);
      }

      if (minClicks !== undefined) {
        filterParts.push(`totalClicks >= ${minClicks}`);
      }

      if (maxClicks !== undefined) {
        filterParts.push(`totalClicks <= ${maxClicks}`);
      }

      if (startDate) {
        filterParts.push(`createdAt >= ${startDate.getTime()}`);
      }

      if (endDate) {
        filterParts.push(`createdAt <= ${endDate.getTime()}`);
      }
    }

    const searchParams: SearchParams = {
      filter: filterParts.join(' AND '),
      offset: (page - 1) * limit,
      limit,
    };

    if (options?.sort) {
      searchParams.sort = [`${options.sort.field}:${options.sort.order}`];
    }

    try {
      const result: SearchResponse<LinkDocument> = await this.index.search(query, searchParams);

      return {
        hits: result.hits,
        total: result.estimatedTotalHits || 0,
        page,
        totalPages: Math.ceil((result.estimatedTotalHits || 0) / limit),
      };
    } catch (error: any) {
      this.logger.error(`Search failed: ${error.message}`);
      return { hits: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async reindexAll(links: Link[]): Promise<void> {
    if (!this.initialized) return;

    try {
      const documents: LinkDocument[] = links.map((link) => ({
        id: link.id,
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        title: link.title || '',
        description: link.description || '',
        domain: link.domain,
        teamId: link.teamId,
        userId: link.userId,
        tags: link.tags || [],
        status: link.status,
        totalClicks: link.totalClicks,
        createdAt: new Date(link.createdAt).getTime(),
        updatedAt: new Date(link.updatedAt).getTime(),
      }));

      await this.index.addDocuments(documents);
      this.logger.log(`Reindexed ${documents.length} links`);
    } catch (error: any) {
      this.logger.error(`Reindex failed: ${error.message}`);
    }
  }
}

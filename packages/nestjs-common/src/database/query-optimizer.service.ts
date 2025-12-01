import { Injectable, Logger } from '@nestjs/common';
import {
  SelectQueryBuilder,
  ObjectLiteral,
  DataSource,
  QueryRunner,
} from 'typeorm';

// 查询性能指标
export interface QueryMetrics {
  queryTime: number;
  rowsAffected: number;
  planningTime?: number;
  executionTime?: number;
}

// 查询分析结果
export interface QueryAnalysis {
  query: string;
  parameters: any[];
  metrics: QueryMetrics;
  suggestions: string[];
  indexSuggestions: IndexSuggestion[];
}

// 索引建议
export interface IndexSuggestion {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
}

// 分页结果
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 批量操作选项
export interface BatchOptions {
  batchSize?: number;
  parallel?: boolean;
  maxConcurrency?: number;
}

@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);
  private readonly slowQueryThreshold = 1000; // 1 second
  private readonly queryMetrics: Map<string, QueryMetrics[]> = new Map();

  constructor(private readonly dataSource: DataSource) {}

  // ==================== 分页优化 ====================

  /**
   * 优化的分页查询（使用 keyset pagination 代替 offset）
   */
  async paginateKeyset<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: {
      limit: number;
      cursor?: string;
      cursorColumn?: string;
      direction?: 'next' | 'prev';
    },
  ): Promise<{ data: T[]; nextCursor: string | null; prevCursor: string | null }> {
    const { limit, cursor, cursorColumn = 'id', direction = 'next' } = options;

    if (cursor) {
      const operator = direction === 'next' ? '>' : '<';
      queryBuilder.andWhere(`${queryBuilder.alias}.${cursorColumn} ${operator} :cursor`, {
        cursor,
      });
    }

    const orderDirection = direction === 'next' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`${queryBuilder.alias}.${cursorColumn}`, orderDirection);
    queryBuilder.take(limit + 1);

    const results = await queryBuilder.getMany();
    const hasMore = results.length > limit;

    if (hasMore) {
      results.pop();
    }

    if (direction === 'prev') {
      results.reverse();
    }

    return {
      data: results,
      nextCursor: hasMore ? (results[results.length - 1] as any)[cursorColumn] : null,
      prevCursor: cursor || null,
    };
  }

  /**
   * 标准分页（带总数缓存优化）
   */
  async paginate<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number = 1,
    limit: number = 20,
    options?: {
      countCache?: number; // 缓存计数的秒数
      skipCount?: boolean; // 跳过计数查询（用于大表）
    },
  ): Promise<PaginatedResult<T>> {
    const skip = (page - 1) * limit;

    let total: number;
    if (options?.skipCount) {
      // 估算总数（避免全表扫描）
      total = await this.estimateCount(queryBuilder);
    } else {
      total = await queryBuilder.getCount();
    }

    const data = await queryBuilder.skip(skip).take(limit).getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * 估算表行数（使用统计信息）
   */
  private async estimateCount<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
  ): Promise<number> {
    const tableName = queryBuilder.expressionMap.mainAlias?.metadata.tableName;

    if (!tableName) {
      return queryBuilder.getCount();
    }

    try {
      const result = await this.dataSource.query(
        `SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = $1`,
        [tableName],
      );
      return result[0]?.estimate || 0;
    } catch {
      return queryBuilder.getCount();
    }
  }

  // ==================== 批量操作优化 ====================

  /**
   * 批量插入优化
   */
  async bulkInsert<T extends ObjectLiteral>(
    entityClass: new () => T,
    entities: Partial<T>[],
    options?: BatchOptions,
  ): Promise<T[]> {
    const batchSize = options?.batchSize || 1000;
    const results: T[] = [];

    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      const inserted = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(entityClass)
        .values(batch as any)
        .returning('*')
        .execute();

      results.push(...(inserted.generatedMaps as T[]));
    }

    return results;
  }

  /**
   * 批量更新优化（使用 CASE WHEN）
   */
  async bulkUpdate<T extends ObjectLiteral>(
    entityClass: new () => T,
    updates: Array<{ id: string | number; changes: Partial<T> }>,
    options?: BatchOptions,
  ): Promise<number> {
    if (updates.length === 0) return 0;

    const batchSize = options?.batchSize || 500;
    let totalAffected = 0;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const ids = batch.map(u => u.id);

      // 构建 CASE WHEN 语句
      const setClauses: string[] = [];
      const params: any = { ids };

      const columns = Object.keys(batch[0].changes);
      columns.forEach(column => {
        let caseClause = `"${column}" = CASE "id"`;
        batch.forEach((update, idx) => {
          const paramName = `${column}_${idx}`;
          caseClause += ` WHEN :id_${idx} THEN :${paramName}`;
          params[`id_${idx}`] = update.id;
          params[paramName] = (update.changes as any)[column];
        });
        caseClause += ` ELSE "${column}" END`;
        setClauses.push(caseClause);
      });

      const metadata = this.dataSource.getMetadata(entityClass);
      const tableName = metadata.tableName;

      const result = await this.dataSource.query(
        `UPDATE "${tableName}" SET ${setClauses.join(', ')} WHERE "id" = ANY(:ids)`,
        [params],
      );

      totalAffected += result[1] || batch.length;
    }

    return totalAffected;
  }

  /**
   * 批量删除优化
   */
  async bulkDelete<T extends ObjectLiteral>(
    entityClass: new () => T,
    ids: (string | number)[],
    options?: BatchOptions,
  ): Promise<number> {
    const batchSize = options?.batchSize || 1000;
    let totalDeleted = 0;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const result = await this.dataSource
        .createQueryBuilder()
        .delete()
        .from(entityClass)
        .whereInIds(batch)
        .execute();

      totalDeleted += result.affected || 0;
    }

    return totalDeleted;
  }

  // ==================== 查询分析 ====================

  /**
   * 分析查询性能
   */
  async analyzeQuery<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
  ): Promise<QueryAnalysis> {
    const [query, parameters] = queryBuilder.getQueryAndParameters();
    const suggestions: string[] = [];
    const indexSuggestions: IndexSuggestion[] = [];

    // 获取执行计划
    const explainResult = await this.dataSource.query(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
      parameters,
    );

    const plan = explainResult[0]['QUERY PLAN'][0];
    const planningTime = plan['Planning Time'];
    const executionTime = plan['Execution Time'];

    // 分析执行计划
    this.analyzePlan(plan.Plan, suggestions, indexSuggestions);

    // 记录慢查询
    const totalTime = planningTime + executionTime;
    if (totalTime > this.slowQueryThreshold) {
      this.logger.warn(`Slow query detected (${totalTime}ms): ${query.substring(0, 200)}...`);
    }

    return {
      query,
      parameters,
      metrics: {
        queryTime: totalTime,
        rowsAffected: plan.Plan['Actual Rows'] || 0,
        planningTime,
        executionTime,
      },
      suggestions,
      indexSuggestions,
    };
  }

  private analyzePlan(
    plan: any,
    suggestions: string[],
    indexSuggestions: IndexSuggestion[],
  ): void {
    // 检测全表扫描
    if (plan['Node Type'] === 'Seq Scan' && plan['Actual Rows'] > 1000) {
      suggestions.push(
        `Sequential scan on ${plan['Relation Name']} with ${plan['Actual Rows']} rows. Consider adding an index.`,
      );

      if (plan['Filter']) {
        const filterColumns = this.extractColumnsFromFilter(plan['Filter']);
        if (filterColumns.length > 0) {
          indexSuggestions.push({
            table: plan['Relation Name'],
            columns: filterColumns,
            type: 'btree',
            reason: 'Frequently filtered columns without index',
          });
        }
      }
    }

    // 检测低效的排序
    if (plan['Node Type'] === 'Sort' && plan['Sort Method']?.includes('external')) {
      suggestions.push('Query using external sort (disk). Consider adding index for ORDER BY columns.');
    }

    // 检测嵌套循环连接（可能低效）
    if (plan['Node Type'] === 'Nested Loop' && plan['Actual Rows'] > 10000) {
      suggestions.push('Large nested loop join detected. Consider using hash join or merge join.');
    }

    // 递归分析子计划
    if (plan.Plans) {
      plan.Plans.forEach((subPlan: any) => {
        this.analyzePlan(subPlan, suggestions, indexSuggestions);
      });
    }
  }

  private extractColumnsFromFilter(filter: string): string[] {
    const columnRegex = /\((\w+)\s*[=<>!]/g;
    const columns: string[] = [];
    let match;

    while ((match = columnRegex.exec(filter)) !== null) {
      columns.push(match[1]);
    }

    return [...new Set(columns)];
  }

  // ==================== 连接管理 ====================

  /**
   * 获取带有超时的查询运行器
   */
  async withTimeout<T>(
    callback: (queryRunner: QueryRunner) => Promise<T>,
    timeoutMs: number = 30000,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // 设置语句超时
      await queryRunner.query(`SET statement_timeout = ${timeoutMs}`);

      return await callback(queryRunner);
    } finally {
      await queryRunner.query('RESET statement_timeout');
      await queryRunner.release();
    }
  }

  /**
   * 在只读副本上执行查询
   */
  async readReplica<T>(callback: () => Promise<T>): Promise<T> {
    // 如果配置了只读副本，在这里切换连接
    // 这是一个简化实现，实际需要配置多数据源
    return callback();
  }

  // ==================== 查询统计 ====================

  /**
   * 记录查询指标
   */
  recordQueryMetrics(queryId: string, metrics: QueryMetrics): void {
    if (!this.queryMetrics.has(queryId)) {
      this.queryMetrics.set(queryId, []);
    }

    const metricsArray = this.queryMetrics.get(queryId)!;
    metricsArray.push(metrics);

    // 只保留最近100条记录
    if (metricsArray.length > 100) {
      metricsArray.shift();
    }
  }

  /**
   * 获取查询统计
   */
  getQueryStats(queryId: string): {
    avgTime: number;
    minTime: number;
    maxTime: number;
    count: number;
  } | null {
    const metrics = this.queryMetrics.get(queryId);
    if (!metrics || metrics.length === 0) return null;

    const times = metrics.map(m => m.queryTime);
    return {
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      count: metrics.length,
    };
  }

  /**
   * 获取所有慢查询
   */
  getSlowQueries(): Array<{ queryId: string; avgTime: number }> {
    const slowQueries: Array<{ queryId: string; avgTime: number }> = [];

    this.queryMetrics.forEach((metrics, queryId) => {
      const avgTime = metrics.reduce((a, b) => a + b.queryTime, 0) / metrics.length;
      if (avgTime > this.slowQueryThreshold) {
        slowQueries.push({ queryId, avgTime });
      }
    });

    return slowQueries.sort((a, b) => b.avgTime - a.avgTime);
  }

  // ==================== 索引建议 ====================

  /**
   * 获取缺失索引建议
   */
  async getMissingIndexes(): Promise<IndexSuggestion[]> {
    const result = await this.dataSource.query(`
      SELECT
        schemaname || '.' || relname as table,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch
      FROM pg_stat_user_tables
      WHERE seq_scan > idx_scan
        AND seq_tup_read > 10000
      ORDER BY seq_tup_read DESC
      LIMIT 10
    `);

    return result.map((row: any) => ({
      table: row.table,
      columns: [],
      type: 'btree' as const,
      reason: `High sequential scan ratio: ${row.seq_scan} seq scans vs ${row.idx_scan} index scans`,
    }));
  }

  /**
   * 获取未使用的索引
   */
  async getUnusedIndexes(): Promise<Array<{ index: string; table: string; size: string }>> {
    const result = await this.dataSource.query(`
      SELECT
        indexrelname as index,
        relname as table,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 10
    `);

    return result;
  }
}

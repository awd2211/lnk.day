import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';

/**
 * 创建 TypeORM Repository Mock 工厂
 * 支持链式调用的 QueryBuilder mock
 */
export function createMockRepository<T extends ObjectLiteral>(): jest.Mocked<Repository<T>> {
  // QueryBuilder Mock - 支持完整链式调用
  const queryBuilderMock = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    execute: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<SelectQueryBuilder<T>>;

  return {
    // 基础 CRUD
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    findOneOrFail: jest.fn(),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    create: jest.fn().mockImplementation((entity) => entity),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'test-id', ...entity })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    remove: jest.fn().mockResolvedValue(undefined),
    count: jest.fn().mockResolvedValue(0),
    increment: jest.fn().mockResolvedValue({ affected: 1 }),
    decrement: jest.fn().mockResolvedValue({ affected: 1 }),
    // QueryBuilder
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    // 事务
    manager: {
      transaction: jest.fn().mockImplementation((cb) => cb({})),
    },
    // 元数据
    metadata: {
      columns: [],
      relations: [],
    },
  } as unknown as jest.Mocked<Repository<T>>;
}

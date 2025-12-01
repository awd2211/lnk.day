import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { VersionService } from '@lnk/nestjs-common';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: jest.Mocked<DataSource>;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockVersionService = {
    getVersion: jest.fn().mockReturnValue('1.0.0'),
    getVersionInfo: jest.fn().mockReturnValue({
      version: '1.0.0',
      buildTime: '2024-01-01T00:00:00Z',
      gitCommit: 'abc123',
      nodeVersion: 'v20.0.0',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: VersionService,
          useValue: mockVersionService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    dataSource = module.get(getDataSourceToken());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return ok status when database is healthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('user-service');
      expect(result.checks.database).toBe('healthy');
      expect(result.timestamp).toBeDefined();
    });

    it('should return degraded status when database is unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection failed'));

      const result = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.checks.database).toBe('unhealthy');
    });

    it('should include version in response', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.check();

      expect(result.version).toBe('1.0.0');
    });
  });

  describe('liveness', () => {
    it('should always return ok status', () => {
      const result = controller.liveness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('readiness', () => {
    it('should return ready=true when database is healthy', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.readiness();

      expect(result.ready).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should return ready=false when database is unhealthy', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection failed'));

      const result = await controller.readiness();

      expect(result.ready).toBe(false);
    });
  });
});

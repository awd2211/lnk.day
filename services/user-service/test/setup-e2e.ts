// E2E 测试设置
jest.setTimeout(30000);

// 清理所有 mock
afterEach(() => {
  jest.clearAllMocks();
});

// 设置环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-e2e-testing-only';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

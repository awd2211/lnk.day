// Jest 全局设置
jest.setTimeout(30000);

// 清理所有 mock
afterEach(() => {
  jest.clearAllMocks();
});

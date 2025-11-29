/**
 * 统一超时配置常量
 * 所有服务应使用这些标准超时值以保持一致性
 */
export const TimeoutConfig = {
  /**
   * HTTP API 请求超时 (30秒)
   * 用于：REST API 调用、外部服务调用
   */
  API: 30000,

  /**
   * 数据库操作超时 (10秒)
   * 用于：查询、事务操作
   */
  DATABASE: 10000,

  /**
   * 消息队列操作超时 (60秒)
   * 用于：消息发送、消费处理
   */
  MESSAGE_QUEUE: 60000,

  /**
   * 健康检查超时 (5秒)
   * 用于：依赖检查、存活探测
   */
  HEALTH_CHECK: 5000,

  /**
   * 缓存操作超时 (3秒)
   * 用于：Redis 读写操作
   */
  CACHE: 3000,

  /**
   * 文件上传超时 (5分钟)
   * 用于：大文件上传操作
   */
  FILE_UPLOAD: 300000,

  /**
   * 外部服务调用超时 (15秒)
   * 用于：第三方 API 调用
   */
  EXTERNAL_SERVICE: 15000,

  /**
   * WebSocket 心跳间隔 (30秒)
   */
  WEBSOCKET_HEARTBEAT: 30000,
} as const;

export type TimeoutType = keyof typeof TimeoutConfig;

/**
 * 获取超时值，支持环境变量覆盖
 */
export function getTimeout(type: TimeoutType): number {
  const envKey = `TIMEOUT_${type}`;
  const envValue = process.env[envKey];

  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return TimeoutConfig[type];
}

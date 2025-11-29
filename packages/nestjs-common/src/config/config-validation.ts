import * as Joi from 'joi';

/**
 * 通用数据库配置验证 Schema
 */
export const databaseConfigSchema = Joi.object({
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
});

/**
 * Redis 配置验证 Schema
 */
export const redisConfigSchema = Joi.object({
  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().default(0),
});

/**
 * RabbitMQ 配置验证 Schema
 */
export const rabbitmqConfigSchema = Joi.object({
  RABBITMQ_URL: Joi.string().uri({ scheme: ['amqp', 'amqps'] }).optional(),
  RABBITMQ_HOST: Joi.string().default('localhost'),
  RABBITMQ_PORT: Joi.number().default(5672),
  RABBITMQ_USER: Joi.string().default('guest'),
  RABBITMQ_PASSWORD: Joi.string().default('guest'),
  RABBITMQ_VHOST: Joi.string().default('/'),
});

/**
 * 通用应用配置验证 Schema
 */
export const appConfigSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
});

/**
 * JWT 配置验证 Schema
 */
export const jwtConfigSchema = Joi.object({
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  JWT_REFRESH_SECRET: Joi.string().min(32).optional(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
});

/**
 * OpenTelemetry 配置验证 Schema
 */
export const otelConfigSchema = Joi.object({
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string()
    .uri()
    .default('http://localhost:4318/v1/traces'),
  OTEL_SERVICE_NAME: Joi.string().optional(),
  OTEL_SAMPLE_RATE: Joi.number().min(0).max(1).default(1),
});

/**
 * 创建完整的配置验证 Schema
 */
export function createConfigValidationSchema(
  schemas: Joi.ObjectSchema[] = [],
): Joi.ObjectSchema {
  const baseSchema = appConfigSchema;

  return schemas.reduce((acc, schema) => acc.concat(schema), baseSchema);
}

/**
 * 常用服务配置预设
 */
export const serviceConfigPresets = {
  /**
   * 需要数据库的服务
   */
  withDatabase: createConfigValidationSchema([databaseConfigSchema]),

  /**
   * 需要数据库和 Redis 的服务
   */
  withDatabaseAndRedis: createConfigValidationSchema([
    databaseConfigSchema,
    redisConfigSchema,
  ]),

  /**
   * 需要数据库、Redis 和 RabbitMQ 的服务
   */
  withFullStack: createConfigValidationSchema([
    databaseConfigSchema,
    redisConfigSchema,
    rabbitmqConfigSchema,
  ]),

  /**
   * 需要认证的服务
   */
  withAuth: createConfigValidationSchema([
    databaseConfigSchema,
    redisConfigSchema,
    jwtConfigSchema,
  ]),
};

/**
 * 验证环境变量的辅助函数
 */
export function validateConfig(
  config: Record<string, unknown>,
  schema: Joi.ObjectSchema,
): Record<string, unknown> {
  const { error, value } = schema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details
      .map((detail) => `  - ${detail.message}`)
      .join('\n');

    throw new Error(
      `Configuration validation failed:\n${errorMessages}\n\nPlease check your environment variables.`,
    );
  }

  return value;
}

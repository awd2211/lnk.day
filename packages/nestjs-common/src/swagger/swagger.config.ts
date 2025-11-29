import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';

export interface SwaggerOptions {
  /** API 标题 */
  title: string;
  /** API 描述 */
  description: string;
  /** API 版本 */
  version?: string;
  /** 文档路径 */
  path?: string;
  /** 是否启用 Bearer Auth */
  enableBearerAuth?: boolean;
  /** 额外的标签 */
  tags?: { name: string; description: string }[];
  /** 服务器 URL */
  servers?: { url: string; description?: string }[];
}

/**
 * 配置 Swagger 文档
 */
export function setupSwagger(
  app: INestApplication,
  options: SwaggerOptions,
): OpenAPIObject {
  const {
    title,
    description,
    version = '1.0',
    path = 'docs',
    enableBearerAuth = true,
    tags = [],
    servers = [],
  } = options;

  const builder = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version);

  // 添加 Bearer Auth
  if (enableBearerAuth) {
    builder.addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    );
  }

  // 添加标签
  tags.forEach((tag) => {
    builder.addTag(tag.name, tag.description);
  });

  // 添加服务器
  servers.forEach((server) => {
    builder.addServer(server.url, server.description);
  });

  const config = builder.build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(path, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  return document;
}

/**
 * 服务 Swagger 配置预设
 */
export const SwaggerPresets = {
  linkService: {
    title: 'Link Service API',
    description: '链接管理服务 - 提供链接创建、管理、文件夹等功能',
    tags: [
      { name: 'links', description: '链接管理' },
      { name: 'folders', description: '文件夹管理' },
      { name: 'templates', description: '链接模板' },
    ],
  },
  userService: {
    title: 'User Service API',
    description: '用户服务 - 提供认证、用户管理、团队管理等功能',
    tags: [
      { name: 'auth', description: '认证' },
      { name: 'users', description: '用户管理' },
      { name: 'teams', description: '团队管理' },
    ],
  },
  campaignService: {
    title: 'Campaign Service API',
    description: '营销活动服务 - 提供活动创建、目标管理、分析等功能',
    tags: [
      { name: 'campaigns', description: '活动管理' },
      { name: 'goals', description: '目标管理' },
      { name: 'templates', description: '活动模板' },
    ],
  },
  qrService: {
    title: 'QR Service API',
    description: 'QR 码服务 - 提供 QR 码生成、管理等功能',
    tags: [
      { name: 'qr', description: 'QR 码管理' },
      { name: 'gs1', description: 'GS1 数字链接' },
    ],
  },
  consoleService: {
    title: 'Console Service API',
    description: '控制台服务 - 提供管理后台 API',
    tags: [
      { name: 'admin', description: '管理员管理' },
      { name: 'system', description: '系统配置' },
      { name: 'audit', description: '审计日志' },
    ],
  },
  apiGateway: {
    title: 'API Gateway',
    description: 'API 网关 - 统一 API 入口',
    tags: [
      { name: 'health', description: '健康检查' },
      { name: 'proxy', description: '代理转发' },
    ],
  },
} as const;

# 版本号管理规范

## 版本号格式

所有微服务使用 [语义化版本](https://semver.org/lang/zh-CN/) (Semantic Versioning):

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
```

- **MAJOR**: 主版本号 - 不兼容的 API 变更
- **MINOR**: 次版本号 - 向后兼容的功能新增
- **PATCH**: 修订号 - 向后兼容的问题修复
- **PRERELEASE**: 预发布标识 (可选) - alpha, beta, rc
- **BUILD**: 构建元数据 (可选) - git commit hash

## 示例

| 版本号 | 说明 |
|--------|------|
| `1.0.0` | 首个稳定版本 |
| `1.1.0` | 新增功能，向后兼容 |
| `1.1.1` | Bug 修复 |
| `2.0.0` | 破坏性变更 |
| `2.1.0-alpha.1` | 预发布版本 |
| `2.1.0-beta.2` | Beta 测试版本 |
| `2.1.0-rc.1` | 发布候选版本 |

## 服务版本号

### 核心服务 (Core Services)

| 服务 | 当前版本 | 说明 |
|------|----------|------|
| api-gateway | 1.0.0 | 用户端 API 网关 |
| user-service | 1.0.0 | 用户认证与管理 |
| link-service | 1.0.0 | 链接 CRUD 核心服务 |

### 业务服务 (Business Services)

| 服务 | 当前版本 | 说明 |
|------|----------|------|
| campaign-service | 1.0.0 | 营销活动管理 |
| qr-service | 1.0.0 | 二维码生成服务 |
| page-service | 1.0.0 | 落地页服务 |
| deeplink-service | 1.0.0 | 深度链接服务 |
| domain-service | 1.0.0 | 自定义域名管理 |

### 集成服务 (Integration Services)

| 服务 | 当前版本 | 说明 |
|------|----------|------|
| integration-service | 1.0.0 | 第三方平台集成 |
| webhook-service | 1.0.0 | Webhook 自动化 |
| notification-service | 1.0.0 | 通知服务 |

### 数据服务 (Data Services)

| 服务 | 当前版本 | 说明 |
|------|----------|------|
| analytics-service | 1.0.0 | 数据分析 (Python) |
| datastream-service | 1.0.0 | 数据导出 (Python) |
| redirect-service | 1.0.0 | 高性能重定向 (Go) |

### 管理服务 (Admin Services)

| 服务 | 当前版本 | 说明 |
|------|----------|------|
| console-service | 1.0.0 | 管理后台 API |

## 版本升级规则

### 何时升级 MAJOR (主版本)

- API 端点路径变更
- 请求/响应数据结构破坏性变更
- 移除已废弃的功能
- 数据库 schema 不兼容迁移
- 依赖的其他服务主版本升级

### 何时升级 MINOR (次版本)

- 新增 API 端点
- 新增可选参数或字段
- 新增功能特性
- 性能优化
- 依赖的其他服务次版本升级

### 何时升级 PATCH (修订号)

- Bug 修复
- 安全漏洞修复
- 文档更新
- 代码重构 (不影响 API)
- 依赖库补丁更新

## 版本同步策略

### 独立版本 (推荐)

每个微服务独立维护版本号，根据各自的变更进行升级。

### 联动升级场景

以下情况需要考虑联动升级:

1. **共享库升级**: `@lnk/shared-types` 或 `@lnk/nestjs-common` 有破坏性变更时
2. **API 契约变更**: 服务间通信接口变更时
3. **数据库 Schema 变更**: 共享数据库表结构变更时

## 版本发布流程

### 1. 开发阶段

```bash
# 创建功能分支
git checkout -b feature/xxx

# 开发完成后更新版本
npm version patch|minor|major
```

### 2. 预发布

```bash
# Alpha 版本
npm version prerelease --preid=alpha

# Beta 版本
npm version prerelease --preid=beta

# RC 版本
npm version prerelease --preid=rc
```

### 3. 正式发布

```bash
# 确保版本号正确
npm version from-git

# 打 tag
git tag v1.2.3
git push origin v1.2.3
```

## 版本显示

### 健康检查端点

所有服务的 `/api/v1/health` 端点返回版本信息:

```json
{
  "status": "ok",
  "service": "user-service",
  "version": "1.2.3",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 环境变量

可通过环境变量覆盖版本信息 (用于 CI/CD):

```bash
BUILD_TIME=2025-01-01T00:00:00Z
GIT_COMMIT=abc1234
```

## API 版本管理

### URL 路径版本

所有 API 使用 URI 版本前缀:

```
/api/v1/users
/api/v2/users  (新版本)
```

### 版本弃用策略

1. 宣布弃用: 在响应头添加 `Deprecation` 和 `Sunset` 头
2. 过渡期: 至少维护 6 个月
3. 正式移除: 提前 30 天通知

```http
Deprecation: true
Sunset: Sat, 01 Jul 2025 00:00:00 GMT
```

## 变更日志

每个服务维护 `CHANGELOG.md` 文件，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/):

```markdown
# Changelog

## [1.2.0] - 2025-01-15

### Added
- 新增批量创建链接 API

### Changed
- 优化链接查询性能

### Fixed
- 修复分页参数验证问题

### Deprecated
- 废弃 /links/legacy 端点
```

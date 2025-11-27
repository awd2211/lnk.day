# lnk.day 产品需求文档 (PRD)

## 1. 产品概述

### 1.1 产品定位
lnk.day 是一个企业级链接管理和数字连接平台，提供 URL 短链接、二维码生成、着陆页面和数据分析等核心功能，帮助企业优化数字营销效果，追踪用户行为数据。

### 1.2 产品愿景
成为全球领先的链接管理解决方案，让每一个企业都能轻松管理、追踪和优化其数字连接点。

### 1.3 目标用户

#### 按行业分类
- 零售电商
- 消费品牌
- 酒店旅游
- 媒体娱乐
- 科技公司
- 医疗健康
- 金融保险
- 教育培训

#### 按团队角色
- 营销人员（数字营销、社交媒体管理）
- 产品运营
- 开发人员（API 集成）
- 客户服务团队

#### 按企业规模
- 小型企业（1-50人）
- 中型企业（51-500人）
- 大型企业（500+人）

### 1.4 核心价值
- **品牌一致性**：自定义域名和品牌链接
- **数据驱动**：实时数据分析和用户行为洞察
- **全渠道覆盖**：支持线上线下多种触点
- **安全合规**：企业级安全保障和隐私合规
- **高效协作**：团队协作和权限管理

---

## 2. 核心功能模块

### 2.1 URL 短链接服务

#### 功能描述
提供高性能、可定制的 URL 缩短服务，支持品牌域名和链接管理。

#### 核心特性
1. **链接缩短**
   - 自动生成短链接（6-8 位字符）
   - 支持自定义短链后缀
   - 批量链接创建（CSV/Excel 导入）
   - 链接过期时间设置

2. **品牌域名**
   - 自定义品牌域名（如 lnk.yourcompany.com）
   - AI 智能域名生成建议
   - 多域名管理
   - 域名 SSL 证书自动配置

3. **链接管理**
   - 链接分组和标签
   - 链接搜索和筛选
   - 链接编辑和归档
   - 批量操作（删除、移动、导出）

4. **高级功能**
   - URL 重定向规则（301/302）
   - UTM 参数自动追踪
   - 链接密码保护
   - 地理位置定向（根据用户地区跳转不同目标）
   - 设备定向（iOS/Android/Desktop 跳转不同页面）
   - 时间定向（特定时间段跳转不同页面）
   - A/B 测试（流量分配到不同目标）
   - Mobile Deep Links（移动深度链接）
     - iOS Universal Links / App Store 智能跳转
     - Android App Links / Google Play 智能跳转
     - 应用未安装时自动跳转应用商店或网页
   - 链接过滤与高级搜索
     - 多维度筛选（日期、标签、域名、状态）
     - 全文搜索
     - 保存搜索条件

#### 用户故事
- 作为营销人员，我希望创建品牌短链接，以便在社交媒体上分享时提升品牌曝光
- 作为运营人员，我希望设置链接过期时间，以便限时活动结束后自动失效
- 作为产品经理，我希望进行链接 A/B 测试，以便优化用户转化率
- 作为 App 运营，我希望配置 Mobile Deep Links，以便用户点击链接后直接打开 App 内对应页面

---

### 2.2 营销活动管理（Campaigns）

#### 功能描述
提供营销活动级别的链接聚合、统计和管理能力，支持跨渠道营销效果追踪。

#### 核心特性
1. **活动创建与管理**
   - 创建营销活动（Campaign）
   - 将多个链接归组到同一活动
   - 活动开始/结束时间设置
   - 活动状态管理（草稿、进行中、已结束）

2. **活动级别统计**
   - 活动总点击量/扫码量
   - 活动内各链接表现对比
   - 活动 ROI 计算
   - 跨渠道效果对比（UTM source 分析）

3. **活动协作**
   - 活动负责人指定
   - 活动成员权限控制
   - 活动评论和备注

4. **活动模板**
   - 保存活动配置为模板
   - 快速复制历史活动
   - 预置行业活动模板

#### 用户故事
- 作为营销经理，我希望创建"双11大促"活动，将所有相关链接归组管理，以便统一追踪活动效果
- 作为数据分析师，我希望查看活动级别的汇总数据，以便评估整体营销 ROI

---

### 2.3 二维码生成器

#### 功能描述
提供动态、可定制的二维码生成和管理服务，支持实时编辑和数据追踪。

#### 核心特性
1. **二维码生成**
   - 静态二维码（生成后不可修改）
   - 动态二维码（生成后可修改目标链接）
   - 批量二维码生成
   - 多种格式导出（PNG、SVG、PDF、EPS）
   - 高清分辨率选项（300dpi、600dpi、1200dpi）

2. **样式定制**
   - 品牌 Logo 嵌入（中心 Logo）
   - 自定义颜色（前景色、背景色）
   - 多种样式模板（圆点、方块、圆角、钻石）
   - 边框和外边距设置
   - 渐变色支持
   - 背景图片支持
   - 自定义眼睛样式（二维码角落定位点）

3. **二维码类型**
   - URL 链接
   - 电话号码
   - 短信内容
   - 邮件地址
   - WiFi 配置
   - 电子名片（vCard）
   - 应用下载（App Store/Google Play）
   - 日历事件（iCal）
   - 地理位置（经纬度）

4. **高级功能**
   - GS1 Digital Link 集成（产品包装标准）
   - GS1-compliant 2D Barcodes（符合 GS1 标准的二维条码）
   - 防伪验证码
   - 扫码次数限制
   - 扫码地理围栏（限制扫码地区）
   - 扫码时间限制
   - 二维码 A/B 测试

#### 用户故事
- 作为品牌经理，我希望生成带品牌 Logo 的二维码，以便在产品包装上使用
- 作为活动运营，我希望动态修改二维码目标，以便在同一物料上更新活动内容
- 作为零售商，我希望追踪线下二维码扫码数据，以便分析线下营销效果

---

### 2.4 着陆页面（lnk.day Pages / Link-in-bio）

#### 功能描述
免代码的移动端优化着陆页面构建工具，支持 Link-in-bio 和数字名片创建。

#### 核心特性
1. **页面构建**
   - 拖拽式页面编辑器
   - 预置模板库（50+ 行业模板）
   - 自定义页面 URL（yourname.lnk.day）
   - 自定义域名支持
   - 移动端自适应设计
   - SEO 优化（meta 标签、描述、Open Graph）
   - 页面加载性能优化

2. **内容组件**
   - 链接按钮（多种样式、动画效果）
   - 图片轮播
   - 视频嵌入（YouTube、Vimeo、TikTok）
   - 文本块（Markdown 支持）
   - 社交媒体图标
   - 联系表单（邮件通知）
   - 产品展示卡片（支持购买链接）
   - 倒计时器
   - 音乐播放器（Spotify、Apple Music、SoundCloud）
   - 地图嵌入（Google Maps）
   - 订阅表单（邮件列表）
   - 自定义 HTML/CSS 块
   - NFT 展示组件
   - Podcast 嵌入

3. **Link-in-bio 功能**
   - 社交媒体个人主页（Instagram、TikTok、YouTube、Twitter/X 等）
   - 多链接集中展示
   - 链接排序和开关
   - 访问数据统计
   - 链接点击动画
   - 临时置顶功能
   - 定时显示/隐藏链接

4. **数字名片**
   - 个人信息展示
   - 一键保存联系人（vCard）
   - 社交媒体链接集合
   - 自我介绍视频
   - 文件下载（简历、作品集）
   - 预约会议集成（Calendly）

5. **高级功能**
   - 页面 A/B 测试
   - 去除 lnk.day 品牌标识（付费版）
   - 自定义 CSS
   - 密码保护页面
   - 访客留言/评论

#### 用户故事
- 作为社交媒体博主，我希望创建 Link-in-bio 页面，以便在 Instagram 简介中展示所有链接
- 作为销售人员，我希望创建数字名片，以便快速分享个人联系方式
- 作为营销人员，我希望无需开发即可创建活动页面，以便快速上线营销活动
- 作为企业用户，我希望使用自定义域名和去除品牌标识，以便保持品牌一致性

---

### 2.5 数据分析平台

#### 功能描述
实时的链接和二维码数据分析系统，提供用户行为洞察和营销效果评估。

#### 核心特性
1. **实时数据监控**
   - 点击量/扫码量实时统计
   - 今日/本周/本月数据对比
   - 数据刷新频率（秒级）
   - 自定义时间范围查询
   - 实时仪表盘（Dashboard）

2. **用户行为分析**
   - 地理位置分布（国家、省份、城市级别）
   - 设备类型（iOS、Android、Desktop、Tablet）
   - 浏览器分布（Chrome、Safari、Firefox 等）
   - 操作系统分布（版本级别）
   - 语言偏好
   - 访问时间分布（按小时、星期、月份）
   - 设备品牌和型号分析

3. **流量来源分析**
   - Referrer 来源（社交媒体、搜索引擎、直接访问）
   - UTM 参数追踪（source、medium、campaign、content、term）
   - 社交媒体平台识别
   - 新访客 vs 回访用户
   - 流量渠道归因

4. **转化分析**
   - 点击率（CTR）
   - 转化漏斗
   - 目标完成率
   - A/B 测试结果对比
   - 营销活动（Campaign）级别汇总

5. **数据导出**
   - CSV/Excel 导出
   - PDF 报表生成
   - 自定义报表模板
   - 定期邮件报告（日报、周报、月报）
   - 报表调度和自动发送

6. **API 和集成**
   - Webhook 实时数据推送
   - Google Analytics 4 集成
   - Facebook Pixel 集成
   - TikTok Pixel 集成
   - 数据 API 接口

7. **Custom Data Streams（企业版）**
   - 实时数据流导出
   - 支持 BigQuery、Snowflake、Redshift、S3
   - 自定义数据格式
   - 历史数据回填

8. **数据保留策略**
   - 免费版：30 天
   - Core 版：1 年
   - Growth/Premium 版：2 年
   - Enterprise 版：自定义（最长无限期）

#### 用户故事
- 作为数据分析师，我希望查看城市级别的用户分布，以便优化地区营销策略
- 作为营销总监，我希望接收周报邮件，以便了解整体营销效果
- 作为开发人员，我希望通过 Webhook 获取实时数据，以便集成到内部系统
- 作为企业用户，我希望将数据实时同步到 BigQuery，以便进行深度分析

---

### 2.6 团队协作和权限管理

#### 功能描述
多团队、多用户的协作管理系统，支持细粒度权限控制。

#### 核心特性
1. **团队管理**
   - 创建多个团队/工作空间
   - 团队成员邀请（邮件邀请）
   - 团队角色管理
   - 跨团队资源共享

2. **权限角色**
   - **超级管理员**：所有权限
   - **管理员**：团队管理、成员管理、所有资源操作
   - **编辑者**：创建、编辑、删除链接和二维码
   - **查看者**：仅查看数据和报表
   - **自定义角色**：细粒度权限配置

3. **资源权限**
   - 链接/二维码所有权
   - 文件夹权限控制
   - 域名访问权限
   - 数据查看权限

4. **审计日志**
   - 操作记录追踪
   - 登录历史
   - 权限变更记录
   - 异常行为告警

#### 用户故事
- 作为团队管理员，我希望设置成员权限，以便保护重要营销数据
- 作为审计人员，我希望查看操作日志，以便追踪数据修改历史

---

### 2.7 API 和开发者工具

#### 功能描述
完整的 RESTful API 和 SDK，支持开发者集成和自动化。

#### 核心特性
1. **API 功能**
   - 链接创建、查询、修改、删除
   - 二维码生成和管理
   - 数据统计查询
   - 批量操作 API
   - Webhook 订阅管理

2. **开发者工具**
   - API 密钥管理
   - API 文档（Swagger/OpenAPI）
   - SDK 支持（JavaScript、Python、PHP、Go、Java）
   - 代码示例库
   - API 调用监控和日志

3. **集成生态**
   - Zapier 集成（500+ 应用联动）
   - Make (Integromat) 集成
   - n8n 集成
   - Shopify 插件
   - WooCommerce 集成
   - WordPress 插件
   - BigCommerce 集成
   - Chrome/Edge 浏览器扩展
   - Firefox 扩展
   - Safari 扩展
   - iOS/Android 移动 App
   - Salesforce 集成
   - HubSpot 集成
   - Marketo 集成
   - Adobe Analytics 集成
   - Slack 通知集成
   - Microsoft Teams 集成
   - Discord 集成

4. **社交媒体集成**
   - Buffer 集成
   - Hootsuite 集成
   - Sprout Social 集成
   - Later 集成
   - Sprinklr 集成

#### 用户故事
- 作为开发人员，我希望通过 API 批量创建链接，以便自动化营销流程
- 作为电商运营，我希望使用 Shopify 插件，以便为产品自动生成短链接
- 作为营销团队，我希望通过 Zapier 自动同步数据到 CRM，以便追踪营销效果

---

### 2.8 安全与合规

#### 功能描述
企业级安全保障和隐私合规体系。

#### 核心特性
1. **安全功能**
   - HTTPS 强制加密
   - 自定义 SSL 证书（企业版）
   - 两步验证（2FA）
   - 单点登录（SSO）支持（SAML 2.0、OAuth 2.0、LDAP）
   - IP 白名单
   - API 密钥权限隔离
   - 会话管理和强制登出
   - 登录异常检测和告警

2. **内容安全**
   - 恶意链接检测和拦截
   - 钓鱼网站识别
   - 病毒扫描
   - 内容审核（人工 + AI）
   - 滥用举报机制
   - 链接信誉评分
   - 自动禁用可疑链接

3. **隐私合规**
   - GDPR 合规（欧盟数据保护）
   - CCPA 合规（加州消费者隐私法）
   - PIPL 合规（中国个人信息保护法）
   - Cookie 同意管理
   - 数据删除请求处理
   - 隐私政策透明化
   - 数据处理协议（DPA）

4. **系统可靠性**
   - 99.9% SLA 保障（99.99% 企业版）
   - 多地域数据中心（美国、欧洲、亚太）
   - 自动故障转移
   - 实时监控和告警
   - DDoS 防护
   - 灾难恢复计划

5. **审计与合规**
   - 完整操作审计日志
   - 数据访问日志
   - 合规报告生成
   - SOC 2 Type II 认证（规划中）

#### 用户故事
- 作为企业 IT 管理员，我希望配置 SSO，以便统一员工身份认证
- 作为合规专员，我希望处理用户数据删除请求，以便满足 GDPR 要求
- 作为安全管理员，我希望配置自定义 SSL 证书，以便满足企业安全要求

---

## 3. 产品定价模型

### 3.1 定价层级

#### 免费版（Free）- $0/month
- Monthly links: 100
- Monthly clicks: 10,000
- QR codes: 10/month
- Link-in-bio pages: 2
- Data retention: 30 days
- Limitations:
  - lnk.day branding included
  - Basic analytics (country level)
  - No custom domains
  - No API access

#### 核心版（Core）- $9/month (annual) or $12/month
- Monthly links: 1,000
- Monthly clicks: 100,000
- QR codes: 50/month
- Link-in-bio pages: 5
- Data retention: 1 year
- Core features:
  - 1 custom domain
  - Remove lnk.day branding
  - Advanced analytics (region level)
  - Custom QR code logo
  - UTM parameter tracking
  - Link password protection
  - API access (1,000 calls/day)
  - Email support

#### 成长版（Growth）- $29/month (annual) or $39/month
- Monthly links: 5,000
- Monthly clicks: 500,000
- QR codes: 200/month
- Link-in-bio pages: 10
- Data retention: 2 years
- Everything in Core, plus:
  - 3 custom domains (1 free)
  - Dynamic QR codes
  - Campaign management
  - Geo/device targeting
  - Basic A/B testing
  - API access (10,000 calls/day)
  - Webhook integration
  - Priority email support

#### 高级版（Premium）- $99/month (annual) or $129/month
- Monthly links: 20,000
- Monthly clicks: 2,000,000
- QR codes: 500/month
- Link-in-bio pages: 20
- Data retention: 2 years
- Everything in Growth, plus:
  - 10 custom domains
  - City-level analytics
  - Device type analytics
  - Mobile Deep Links
  - Advanced A/B testing (multi-variant)
  - Time-based targeting
  - API access (50,000 calls/day)
  - Phone support
  - Dedicated customer success manager

#### 企业版（Enterprise）- Custom pricing
- Unlimited links and clicks
- Unlimited QR codes
- Unlimited Link-in-bio pages
- Data retention: Custom (up to unlimited)
- Everything in Premium, plus:
  - Unlimited custom domains
  - Custom SSL certificates
  - SSO (SAML 2.0, LDAP)
  - Custom Data Streams
  - 99.99% SLA
  - Dedicated account manager
  - Custom contract terms
  - White-label option
  - Regional data center deployment
  - Unlimited API calls
  - 24/7 phone support
  - Custom development services

### 3.2 Add-on Services
- Additional domains: $5/month per domain
- Additional API calls: $20 per 100,000 calls
- Data export service: $50 per export
- Custom development: Quote upon request

---

## 4. 非功能性需求

### 4.1 性能指标
- 页面加载时间：< 1 秒
- API 响应时间：< 200ms (P95)
- 短链跳转延迟：< 100ms
- 并发支持：10,000 QPS
- 数据刷新延迟：< 5 秒

### 4.2 可用性
- 系统可用性：99.9% (企业版)
- 计划内维护：每月不超过 4 小时
- 故障恢复时间：< 1 小时

### 4.3 扩展性
- 支持百万级用户规模
- 支持十亿级链接存储
- 支持日处理 100 亿次点击

### 4.4 兼容性
- 浏览器：Chrome、Firefox、Safari、Edge（最近 2 个版本）
- 移动端：iOS 13+、Android 8+
- API：RESTful (HTTP/1.1, HTTP/2)

### 4.5 国际化
- 多语言支持：中文、英文、日文、韩文、德文、法文、西班牙文
- 多时区支持
- 多货币支持

---

## 5. 产品路线图

### 第一阶段（MVP - 3 个月）
- [ ] URL 短链接核心功能
- [ ] 基础数据分析
- [ ] 用户注册和认证
- [ ] 响应式 Web 界面

### 第二阶段（6 个月）
- [ ] 二维码生成器
- [ ] 自定义域名支持
- [ ] 高级数据分析
- [ ] API v1.0 发布

### 第三阶段（9 个月）
- [ ] 着陆页面构建器
- [ ] 团队协作功能
- [ ] Webhook 集成
- [ ] 移动端 App（iOS/Android）

### 第四阶段（12 个月）
- [ ] 企业级 SSO
- [ ] 白标解决方案
- [ ] 高级定向功能（地理、设备、时间）
- [ ] A/B 测试平台

---

## 6. 成功指标 (KPI)

### 用户增长
- 注册用户数
- 付费转化率
- 月活跃用户（MAU）
- 用户留存率（次日/7日/30日）

### 业务指标
- 月经常性收入（MRR）
- 年度合同价值（ACV）
- 客户获取成本（CAC）
- 客户生命周期价值（LTV）

### 产品指标
- 日创建链接数
- 日点击/扫码量
- API 调用量
- 系统可用性

### 用户满意度
- Net Promoter Score (NPS)
- 客户满意度（CSAT）
- 客户流失率
- 支持工单响应时间

---

## 7. 风险与挑战

### 技术风险
- 高并发流量处理
- 数据安全和隐私保护
- 系统稳定性保障

### 业务风险
- 市场竞争（Bitly、短链、TinyURL 等）
- 定价策略平衡
- 获客成本控制

### 合规风险
- 各国数据隐私法规
- 内容审核压力
- 恶意滥用防范

---

## 附录

### 竞品功能对比（与 Bitly 对齐）

| 功能 | lnk.day | Bitly | Rebrandly | Short.io |
|------|---------|-------|-----------|----------|
| **基础功能** |||||
| URL 短链接 | ✅ | ✅ | ✅ | ✅ |
| 自定义短链后缀 | ✅ | ✅ | ✅ | ✅ |
| 自定义域名 | ✅ | ✅ | ✅ | ✅ |
| 批量创建 | ✅ | ✅ | ✅ | ✅ |
| 链接过期设置 | ✅ | ✅ | ✅ | ✅ |
| **二维码** |||||
| 二维码生成 | ✅ | ✅ | ✅ | ✅ |
| 自定义 Logo | ✅ | ✅ | ✅ | ✅ |
| 动态二维码 | ✅ | ✅ | ✅ | ✅ |
| GS1 Digital Link | ✅ | ✅ | ❌ | ❌ |
| **着陆页面** |||||
| Link-in-bio | ✅ | ✅ | ❌ | ❌ |
| 页面构建器 | ✅ | ✅ | ❌ | ❌ |
| 自定义模板 | ✅ | ✅ | ❌ | ❌ |
| **数据分析** |||||
| 基础分析 | ✅ | ✅ | ✅ | ✅ |
| 城市级分析 | ✅ | ✅ | ✅ | ✅ |
| 设备详细分析 | ✅ | ✅ | ✅ | ✅ |
| UTM 追踪 | ✅ | ✅ | ✅ | ✅ |
| Custom Data Streams | ✅ | ✅ | ❌ | ❌ |
| **高级功能** |||||
| Mobile Deep Links | ✅ | ✅ | ❌ | ❌ |
| 地理位置定向 | ✅ | ✅ | ✅ | ✅ |
| 设备定向 | ✅ | ✅ | ✅ | ✅ |
| 时间定向 | ✅ | ❌ | ❌ | ❌ |
| A/B 测试 | ✅ | ✅ | ❌ | ✅ |
| 链接密码保护 | ✅ | ❌ | ❌ | ❌ |
| 营销活动管理 | ✅ | ✅ | ❌ | ❌ |
| **企业功能** |||||
| SSO 单点登录 | ✅ | ✅ | ✅ | ❌ |
| 自定义 SSL | ✅ | ✅ | ❌ | ❌ |
| 团队协作 | ✅ | ✅ | ✅ | ✅ |
| API 支持 | ✅ | ✅ | ✅ | ✅ |
| Webhook | ✅ | ✅ | ✅ | ✅ |
| **本地化** |||||
| 多语言支持 | ✅ | ✅ | ✅ | ❌ |
| 全球 CDN 部署 | ✅ | ✅ | ✅ | ❌ |
| 本地数据合规 | ✅ | ✅ | ✅ | ❌ |

### 定价对比

| Tier | lnk.day | Bitly | Rebrandly |
|------|---------|-------|-----------|
| Free | 100 links/mo | 5 links/mo | 10 links/mo |
| Starter | $9/mo | $10/mo | $13/mo |
| Growth | $29/mo | $29/mo | $34/mo |
| Premium | $99/mo | $199/mo | $99/mo |
| Enterprise | Custom | Custom | Custom |

### lnk.day 差异化优势

1. **更慷慨的免费版**：100 链接/月 vs Bitly 的 5 链接/月
2. **全球化部署**：多区域 CDN、GDPR/CCPA 合规、多语言支持
3. **独特功能**：
   - 时间定向跳转（Bitly 无）
   - 链接密码保护（Bitly 无）
   - 防伪验证码（Bitly 无）
   - 地理围栏限制（Bitly 无）
4. **定价优势**：同等功能下价格更具竞争力
5. **开发者友好**：完善的 API 文档、多语言 SDK、Webhook 支持

### 参考资料
- Bitly Enterprise 功能分析 (2025)
- Bitly Pricing - https://bitly.com/pages/pricing
- 短链接行业研究报告 2024-2025
- GDPR/CCPA/PIPL 合规指南

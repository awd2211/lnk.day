-- lnk.day ClickHouse 分析数据库初始化脚本

-- 创建数据库
CREATE DATABASE IF NOT EXISTS lnkday_analytics;

-- 使用数据库
USE lnkday_analytics;

-- ============================================
-- 访问事件表 (主表)
-- ============================================

CREATE TABLE IF NOT EXISTS link_events (
    event_id String,
    event_type Enum8('link_click' = 1, 'qr_scan' = 2, 'page_view' = 3),
    link_id String,
    team_id String,
    user_id String,
    timestamp DateTime64(3),

    -- 访客信息
    visitor_ip String,
    visitor_fingerprint String,
    is_bot UInt8 DEFAULT 0,
    is_unique UInt8 DEFAULT 1,

    -- 地理位置
    country LowCardinality(String) DEFAULT '',
    country_name String DEFAULT '',
    region String DEFAULT '',
    city String DEFAULT '',
    latitude Float32 DEFAULT 0,
    longitude Float32 DEFAULT 0,
    timezone String DEFAULT '',

    -- 设备信息
    device_type LowCardinality(String) DEFAULT '',
    os LowCardinality(String) DEFAULT '',
    os_version String DEFAULT '',
    browser LowCardinality(String) DEFAULT '',
    browser_version String DEFAULT '',
    device_brand String DEFAULT '',
    device_model String DEFAULT '',

    -- 来源信息
    referrer String DEFAULT '',
    referrer_domain String DEFAULT '',
    referrer_source LowCardinality(String) DEFAULT '',
    referrer_medium LowCardinality(String) DEFAULT '',

    -- UTM 参数
    utm_source String DEFAULT '',
    utm_medium String DEFAULT '',
    utm_campaign String DEFAULT '',
    utm_content String DEFAULT '',
    utm_term String DEFAULT '',

    -- 其他
    user_agent String DEFAULT '',
    language LowCardinality(String) DEFAULT '',

    -- 目标 URL (跳转后)
    target_url String DEFAULT ''
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (team_id, link_id, timestamp, event_id)
TTL toDateTime(timestamp) + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;

-- ============================================
-- 物化视图: 每日统计
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS link_daily_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (team_id, link_id, date)
AS SELECT
    team_id,
    link_id,
    toDate(timestamp) AS date,
    count() AS clicks,
    uniqExact(visitor_fingerprint) AS unique_visitors,
    countIf(device_type = 'mobile') AS mobile_clicks,
    countIf(device_type = 'desktop') AS desktop_clicks,
    countIf(device_type = 'tablet') AS tablet_clicks,
    countIf(is_bot = 1) AS bot_clicks
FROM link_events
GROUP BY team_id, link_id, date;

-- ============================================
-- 物化视图: 每小时统计
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS link_hourly_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMMDD(hour)
ORDER BY (team_id, link_id, hour)
TTL hour + INTERVAL 90 DAY
AS SELECT
    team_id,
    link_id,
    toStartOfHour(timestamp) AS hour,
    count() AS clicks,
    uniqExact(visitor_fingerprint) AS unique_visitors
FROM link_events
GROUP BY team_id, link_id, hour;

-- ============================================
-- 物化视图: 国家/地区统计
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS link_country_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (team_id, link_id, date, country)
AS SELECT
    team_id,
    link_id,
    toDate(timestamp) AS date,
    country,
    count() AS clicks,
    uniqExact(visitor_fingerprint) AS unique_visitors
FROM link_events
GROUP BY team_id, link_id, date, country;

-- ============================================
-- 物化视图: 设备统计
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS link_device_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (team_id, link_id, date, device_type, os, browser)
AS SELECT
    team_id,
    link_id,
    toDate(timestamp) AS date,
    device_type,
    os,
    browser,
    count() AS clicks,
    uniqExact(visitor_fingerprint) AS unique_visitors
FROM link_events
GROUP BY team_id, link_id, date, device_type, os, browser;

-- ============================================
-- 物化视图: 来源统计
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS link_referrer_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (team_id, link_id, date, referrer_domain)
AS SELECT
    team_id,
    link_id,
    toDate(timestamp) AS date,
    referrer_domain,
    referrer_source,
    count() AS clicks,
    uniqExact(visitor_fingerprint) AS unique_visitors
FROM link_events
GROUP BY team_id, link_id, date, referrer_domain, referrer_source;

-- ============================================
-- 物化视图: UTM 统计
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS link_utm_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (team_id, link_id, date, utm_source, utm_medium, utm_campaign)
AS SELECT
    team_id,
    link_id,
    toDate(timestamp) AS date,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    count() AS clicks,
    uniqExact(visitor_fingerprint) AS unique_visitors
FROM link_events
WHERE utm_source != ''
GROUP BY team_id, link_id, date, utm_source, utm_medium, utm_campaign, utm_content, utm_term;

-- ============================================
-- 物化视图: 团队总览统计
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS team_daily_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (team_id, date)
AS SELECT
    team_id,
    toDate(timestamp) AS date,
    count() AS total_clicks,
    uniqExact(link_id) AS active_links,
    uniqExact(visitor_fingerprint) AS unique_visitors
FROM link_events
GROUP BY team_id, date;

-- ============================================
-- 简化版点击表 (用于 Kafka Consumer 写入)
-- 与 kafka_consumer.py 中的字段对应
-- ============================================

CREATE TABLE IF NOT EXISTS clicks (
    id String,
    link_id String,
    short_code String,
    timestamp DateTime64(3),
    ip String,
    user_agent String,
    referer String,
    country String DEFAULT '',
    region String DEFAULT '',
    city String DEFAULT '',
    device String DEFAULT '',
    browser String DEFAULT '',
    os String DEFAULT ''
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (link_id, timestamp, id)
TTL toDateTime(timestamp) + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;

-- 为 clicks 表创建物化视图: 每日统计
CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_daily_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (link_id, date)
AS SELECT
    link_id,
    toDate(timestamp) AS date,
    count() AS clicks,
    uniqExact(ip) AS unique_visitors,
    countIf(device = 'mobile' OR device = 'MOBILE') AS mobile_clicks,
    countIf(device = 'desktop' OR device = 'DESKTOP') AS desktop_clicks
FROM clicks
GROUP BY link_id, date;

-- 为 clicks 表创建物化视图: 国家统计
CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_country_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (link_id, date, country)
AS SELECT
    link_id,
    toDate(timestamp) AS date,
    country,
    count() AS clicks,
    uniqExact(ip) AS unique_visitors
FROM clicks
GROUP BY link_id, date, country;

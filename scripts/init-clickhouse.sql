-- ClickHouse 分析数据库初始化

CREATE DATABASE IF NOT EXISTS lnk_analytics;

-- 访问事件表
CREATE TABLE IF NOT EXISTS lnk_analytics.link_events (
    event_id String,
    event_type Enum8('click' = 1, 'qr_scan' = 2, 'page_view' = 3),
    link_id String,
    user_id String,
    timestamp DateTime64(3),
    visitor_ip String,
    country LowCardinality(String),
    city String,
    device_type LowCardinality(String),
    os LowCardinality(String),
    browser LowCardinality(String),
    referrer String,
    utm_source String,
    utm_medium String,
    utm_campaign String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, link_id, timestamp)
TTL toDateTime(timestamp) + INTERVAL 2 YEAR;

-- 每日统计视图
CREATE MATERIALIZED VIEW IF NOT EXISTS lnk_analytics.daily_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (user_id, link_id, date)
AS SELECT
    user_id,
    link_id,
    toDate(timestamp) AS date,
    count() AS clicks,
    uniqExact(visitor_ip) AS unique_visitors
FROM lnk_analytics.link_events
GROUP BY user_id, link_id, date;

-- 简化版点击表 (用于 Kafka Consumer 写入)
-- 与 kafka_consumer.py 中的字段对应
CREATE TABLE IF NOT EXISTS lnk_analytics.clicks (
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

-- clicks 每日统计视图
CREATE MATERIALIZED VIEW IF NOT EXISTS lnk_analytics.clicks_daily_stats
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
FROM lnk_analytics.clicks
GROUP BY link_id, date;

-- Create database
CREATE DATABASE IF NOT EXISTS lnk_analytics;

-- Switch to database
USE lnk_analytics;

-- Clicks table - stores all click events
CREATE TABLE IF NOT EXISTS clicks
(
    id String,
    link_id String,
    short_code String,
    timestamp DateTime,
    ip String,
    user_agent String,
    referer String DEFAULT '',
    country String DEFAULT 'Unknown',
    region String DEFAULT '',
    city String DEFAULT '',
    device String DEFAULT '',
    browser String DEFAULT '',
    os String DEFAULT '',

    -- Partition and ordering
    event_date Date MATERIALIZED toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (link_id, timestamp, id)
TTL timestamp + INTERVAL 365 DAY
SETTINGS index_granularity = 8192;

-- Create indexes for common queries
ALTER TABLE clicks ADD INDEX idx_country country TYPE bloom_filter GRANULARITY 4;
ALTER TABLE clicks ADD INDEX idx_device device TYPE bloom_filter GRANULARITY 4;
ALTER TABLE clicks ADD INDEX idx_browser browser TYPE bloom_filter GRANULARITY 4;

-- Daily aggregated stats (materialized view)
CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_daily_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (link_id, date)
AS
SELECT
    link_id,
    toDate(timestamp) as date,
    count() as total_clicks,
    uniq(ip) as unique_clicks
FROM clicks
GROUP BY link_id, date;

-- Hourly aggregated stats (materialized view)
CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_hourly_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (link_id, hour)
TTL hour + INTERVAL 30 DAY
AS
SELECT
    link_id,
    toStartOfHour(timestamp) as hour,
    count() as total_clicks,
    uniq(ip) as unique_clicks
FROM clicks
GROUP BY link_id, hour;

-- Country aggregation (materialized view)
CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_country_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (link_id, date, country)
AS
SELECT
    link_id,
    toDate(timestamp) as date,
    country,
    count() as clicks
FROM clicks
GROUP BY link_id, date, country;

-- Device aggregation (materialized view)
CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_device_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (link_id, date, device)
AS
SELECT
    link_id,
    toDate(timestamp) as date,
    device,
    count() as clicks
FROM clicks
GROUP BY link_id, date, device;

-- Browser aggregation (materialized view)
CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_browser_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (link_id, date, browser)
AS
SELECT
    link_id,
    toDate(timestamp) as date,
    browser,
    count() as clicks
FROM clicks
GROUP BY link_id, date, browser;

-- Referer aggregation (materialized view)
CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_referer_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (link_id, date, referer)
AS
SELECT
    link_id,
    toDate(timestamp) as date,
    referer,
    count() as clicks
FROM clicks
WHERE referer != ''
GROUP BY link_id, date, referer;

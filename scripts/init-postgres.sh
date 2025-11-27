#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- 创建扩展
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";

    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        name VARCHAR(100),
        avatar_url TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- 链接表
    CREATE TABLE IF NOT EXISTS links (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        domain VARCHAR(100) DEFAULT 'lnk.day',
        slug VARCHAR(100) NOT NULL,
        long_url TEXT NOT NULL,
        title VARCHAR(255),
        tags TEXT[],
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(domain, slug)
    );

    CREATE INDEX IF NOT EXISTS idx_links_slug ON links(domain, slug);
    CREATE INDEX IF NOT EXISTS idx_links_user ON links(user_id);

    -- 二维码表
    CREATE TABLE IF NOT EXISTS qr_codes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        link_id UUID REFERENCES links(id),
        style JSONB DEFAULT '{}',
        cdn_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );

    -- 页面表
    CREATE TABLE IF NOT EXISTS pages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        slug VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255),
        blocks JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
EOSQL

echo "PostgreSQL 初始化完成"

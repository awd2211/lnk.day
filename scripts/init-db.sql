-- lnk.day PostgreSQL 初始化脚本
-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 用户服务数据库 (user-service)
-- ============================================
CREATE DATABASE lnk_users;
\c lnk_users;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    plan VARCHAR(20) DEFAULT 'free',
    owner_id UUID REFERENCES users(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_teams_owner ON teams(owner_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- ============================================
-- 链接服务数据库 (link-service)
-- ============================================
\c lnk_main;
CREATE DATABASE lnk_links;
\c lnk_links;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL,
    user_id UUID NOT NULL,
    short_code VARCHAR(20) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    clicks INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    password_hash VARCHAR(255),
    expires_at TIMESTAMP,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_links_team ON links(team_id);
CREATE INDEX idx_links_user ON links(user_id);
CREATE INDEX idx_links_short_code ON links(short_code);
CREATE INDEX idx_links_status ON links(status);
CREATE INDEX idx_links_created_at ON links(created_at DESC);

-- ============================================
-- 营销活动数据库 (campaign-service)
-- ============================================
\c lnk_main;
CREATE DATABASE lnk_campaigns;
\c lnk_campaigns;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'marketing',
    status VARCHAR(20) DEFAULT 'draft',
    channels TEXT[] DEFAULT '{}',
    utm_params JSONB DEFAULT '{}',
    goal JSONB,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    budget DECIMAL(10,2),
    spent DECIMAL(10,2) DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    link_ids TEXT[] DEFAULT '{}',
    total_links INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaigns_team ON campaigns(team_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- ============================================
-- 页面服务数据库 (page-service)
-- ============================================
\c lnk_main;
CREATE DATABASE lnk_pages;
\c lnk_pages;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL,
    user_id UUID NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255),
    description TEXT,
    theme JSONB DEFAULT '{}',
    blocks JSONB DEFAULT '[]',
    seo JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'draft',
    published_at TIMESTAMP,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pages_team ON pages(team_id);
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_status ON pages(status);

-- ============================================
-- 深度链接数据库 (deeplink-service)
-- ============================================
\c lnk_main;
CREATE DATABASE lnk_deeplinks;
\c lnk_deeplinks;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE deeplinks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    fallback_url TEXT NOT NULL,
    ios_config JSONB DEFAULT '{}',
    android_config JSONB DEFAULT '{}',
    desktop_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deeplinks_team ON deeplinks(team_id);
CREATE INDEX idx_deeplinks_slug ON deeplinks(slug);

-- ============================================
-- 控制台数据库 (console-service)
-- ============================================
\c lnk_main;
CREATE DATABASE lnk_console;
\c lnk_console;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'admin',
    active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 插入默认管理员 (密码: admin123)
INSERT INTO admins (email, password, name, role) VALUES
('admin@lnk.day', '$2b$10$rQZ8K.PqKn5JvMqXzJvJPuPwJpQpJpJpJpJpJpJpJpJpJpJpJpJ', 'Admin', 'superadmin');

CREATE INDEX idx_admins_email ON admins(email);

-- ============================================
-- 完成
-- ============================================
\c lnk_main;
SELECT 'lnk.day PostgreSQL 初始化完成!' as message;

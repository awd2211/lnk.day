-- lnk.day PostgreSQL 初始化脚本
-- 创建必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 用户相关表
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(32) PRIMARY KEY DEFAULT replace(uuid_generate_v4()::text, '-', ''),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255),
    name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    email_verified_at TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 团队表
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(32) PRIMARY KEY DEFAULT replace(uuid_generate_v4()::text, '-', ''),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    plan VARCHAR(20) DEFAULT 'free',
    owner_id VARCHAR(32) REFERENCES users(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);

-- 团队成员表
CREATE TABLE IF NOT EXISTS team_members (
    id VARCHAR(32) PRIMARY KEY DEFAULT replace(uuid_generate_v4()::text, '-', ''),
    team_id VARCHAR(32) REFERENCES teams(id) ON DELETE CASCADE,
    user_id VARCHAR(32) REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ============================================
-- 链接相关表
-- ============================================

-- 文件夹表
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(32) PRIMARY KEY DEFAULT replace(uuid_generate_v4()::text, '-', ''),
    team_id VARCHAR(32) REFERENCES teams(id) ON DELETE CASCADE,
    user_id VARCHAR(32) REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    parent_id VARCHAR(32) REFERENCES folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_folders_team ON folders(team_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);

-- 链接表
CREATE TABLE IF NOT EXISTS links (
    id VARCHAR(32) PRIMARY KEY DEFAULT replace(uuid_generate_v4()::text, '-', ''),
    team_id VARCHAR(32) REFERENCES teams(id) ON DELETE CASCADE,
    user_id VARCHAR(32) REFERENCES users(id),
    domain VARCHAR(100) NOT NULL DEFAULT 'lnk.day',
    slug VARCHAR(100) NOT NULL,
    long_url TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    tags VARCHAR(50)[],
    folder_id VARCHAR(32) REFERENCES folders(id) ON DELETE SET NULL,
    password_hash VARCHAR(255),
    expire_at TIMESTAMP,
    redirect_type VARCHAR(10) DEFAULT '302',
    status VARCHAR(20) DEFAULT 'active',
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),
    redirect_rules JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(domain, slug)
);

CREATE INDEX IF NOT EXISTS idx_links_team ON links(team_id);
CREATE INDEX IF NOT EXISTS idx_links_user ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_slug ON links(domain, slug);
CREATE INDEX IF NOT EXISTS idx_links_status ON links(status);
CREATE INDEX IF NOT EXISTS idx_links_tags ON links USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_folder ON links(folder_id);

-- 链接统计缓存表
CREATE TABLE IF NOT EXISTS link_stats (
    link_id VARCHAR(32) PRIMARY KEY REFERENCES links(id) ON DELETE CASCADE,
    total_clicks BIGINT DEFAULT 0,
    unique_visitors BIGINT DEFAULT 0,
    last_click_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 二维码相关表
-- ============================================

CREATE TABLE IF NOT EXISTS qr_codes (
    id VARCHAR(32) PRIMARY KEY DEFAULT replace(uuid_generate_v4()::text, '-', ''),
    team_id VARCHAR(32) REFERENCES teams(id) ON DELETE CASCADE,
    user_id VARCHAR(32) REFERENCES users(id),
    link_id VARCHAR(32) REFERENCES links(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'dynamic',
    content_type VARCHAR(20) NOT NULL DEFAULT 'url',
    content TEXT NOT NULL,
    title VARCHAR(255),
    style JSONB DEFAULT '{}',
    file_urls JSONB DEFAULT '{}',
    cdn_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_team ON qr_codes(team_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_link ON qr_codes(link_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);

-- ============================================
-- 页面相关表
-- ============================================

CREATE TABLE IF NOT EXISTS pages (
    id VARCHAR(32) PRIMARY KEY DEFAULT replace(uuid_generate_v4()::text, '-', ''),
    team_id VARCHAR(32) REFERENCES teams(id) ON DELETE CASCADE,
    user_id VARCHAR(32) REFERENCES users(id),
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255),
    description TEXT,
    favicon_url TEXT,
    theme JSONB DEFAULT '{}',
    blocks JSONB DEFAULT '[]',
    seo_meta JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'draft',
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pages_team ON pages(team_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);

-- ============================================
-- API 密钥表
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(32) PRIMARY KEY DEFAULT replace(uuid_generate_v4()::text, '-', ''),
    team_id VARCHAR(32) REFERENCES teams(id) ON DELETE CASCADE,
    user_id VARCHAR(32) REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    scopes VARCHAR(50)[] DEFAULT '{}',
    ip_whitelist VARCHAR(50)[] DEFAULT '{}',
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_team ON api_keys(team_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================
-- 审计日志表
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(32) PRIMARY KEY DEFAULT replace(uuid_generate_v4()::text, '-', ''),
    team_id VARCHAR(32) REFERENCES teams(id) ON DELETE CASCADE,
    user_id VARCHAR(32) REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(32),
    ip_address VARCHAR(50),
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_team ON audit_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- 滥用举报表
-- ============================================

CREATE TABLE IF NOT EXISTS abuse_reports (
    id VARCHAR(32) PRIMARY KEY DEFAULT replace(uuid_generate_v4()::text, '-', ''),
    link_id VARCHAR(32) REFERENCES links(id) ON DELETE CASCADE,
    reporter_ip VARCHAR(50),
    reason VARCHAR(50) NOT NULL,
    details TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by VARCHAR(32) REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abuse_reports_link ON abuse_reports(link_id);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_status ON abuse_reports(status);

-- ============================================
-- 更新时间触发器
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为各表创建触发器
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['users', 'teams', 'links', 'qr_codes', 'pages', 'folders']
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
                BEFORE UPDATE ON %s
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;

-- 完成信息
DO $$
BEGIN
    RAISE NOTICE 'lnk.day PostgreSQL 初始化完成!';
END;
$$;

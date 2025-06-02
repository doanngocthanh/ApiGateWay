-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plans table
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    request_limit_per_day INTEGER NOT NULL,
    api_key_limit INTEGER NOT NULL DEFAULT 1,
    duration_days INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Keys table
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    key_value VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);

-- API Logs table
CREATE TABLE api_logs (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES api_keys(id),
    endpoint VARCHAR(255),
    method VARCHAR(10),
    ip_address INET,
    user_agent TEXT,
    response_status INTEGER,
    request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Orders table
CREATE TABLE payment_orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(255),
    payment_method VARCHAR(50),
    paid_at TIMESTAMP,
    callback_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for payment_orders
CREATE INDEX idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX idx_payment_orders_status ON payment_orders(status);
CREATE INDEX idx_payment_orders_order_id ON payment_orders(order_id);
```
-- Insert default plans
INSERT INTO plans (name, description, price, request_limit_per_day, api_key_limit, duration_days) VALUES
('Free', 'Basic plan for testing', 0, 100, 1, 30),
('Pro', 'Professional plan', 29.99, 10000, 5, 30),
('Enterprise', 'Enterprise plan', 99.99, 100000, 20, 30);

-- Create indexes
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_value ON api_keys(key_value);
CREATE INDEX idx_api_logs_api_key_id ON api_logs(api_key_id);
CREATE INDEX idx_api_logs_request_time ON api_logs(request_time);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- API Proxy Database Schema Extension

-- Proxy Destinations table - stores backend service configurations
CREATE TABLE proxy_destinations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_url VARCHAR(500) NOT NULL,
    method_override VARCHAR(10), -- Override request method if needed
    timeout_ms INTEGER DEFAULT 30000,
    max_retries INTEGER DEFAULT 3,
    health_check_url VARCHAR(500),
    health_check_interval_seconds INTEGER DEFAULT 300,
    is_healthy BOOLEAN DEFAULT TRUE,
    last_health_check TIMESTAMP,
    
    -- Authentication for backend service
    auth_type VARCHAR(20) DEFAULT 'none', -- none, bearer, basic, api_key
    auth_header_name VARCHAR(100),
    auth_token TEXT,
    auth_username VARCHAR(100),
    auth_password VARCHAR(100),
    
    -- Request transformation
    strip_path_prefix VARCHAR(100), -- Remove this prefix from incoming path
    add_path_prefix VARCHAR(100),   -- Add this prefix to outgoing path
    custom_headers JSONB,           -- Custom headers to add
    transform_request JSONB,        -- Request transformation rules
    transform_response JSONB,       -- Response transformation rules
    
    -- Rate limiting for backend
    backend_rate_limit INTEGER,
    backend_rate_window_ms INTEGER DEFAULT 60000,
    
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Key Proxy Mappings - which API keys can access which destinations
CREATE TABLE api_key_proxy_mappings (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
    proxy_destination_id INTEGER REFERENCES proxy_destinations(id) ON DELETE CASCADE,
    
    -- Path-based routing
    path_pattern VARCHAR(200) DEFAULT '*', -- e.g., '/api/v1/*', '/users/*'
    allowed_methods VARCHAR(50) DEFAULT 'GET,POST,PUT,DELETE', -- CSV of allowed methods
    
    -- Override destination settings per API key
    custom_timeout_ms INTEGER,
    custom_headers JSONB,
    custom_transform JSONB,
    
    priority INTEGER DEFAULT 100, -- Lower number = higher priority for routing
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(api_key_id, proxy_destination_id, path_pattern)
);

-- Proxy Logs - detailed logging of proxy requests
CREATE TABLE proxy_logs (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES api_keys(id),
    proxy_destination_id INTEGER REFERENCES proxy_destinations(id),
    
    -- Request details
    request_method VARCHAR(10),
    request_path VARCHAR(500),
    request_query TEXT,
    request_headers JSONB,
    request_body_size INTEGER,
    
    -- Backend request details  
    backend_url TEXT,
    backend_method VARCHAR(10),
    backend_headers JSONB,
    
    -- Response details
    response_status INTEGER,
    response_headers JSONB,
    response_body_size INTEGER,
    response_time_ms INTEGER,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Client info
    client_ip INET,
    user_agent TEXT
);

-- Proxy Health Checks - track backend service health
CREATE TABLE proxy_health_checks (
    id SERIAL PRIMARY KEY,
    proxy_destination_id INTEGER REFERENCES proxy_destinations(id) ON DELETE CASCADE,
    is_healthy BOOLEAN,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Load Balancer Configurations (for future enhancement)
CREATE TABLE load_balancer_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    strategy VARCHAR(20) DEFAULT 'round_robin', -- round_robin, weighted, least_connections
    sticky_sessions BOOLEAN DEFAULT FALSE,
    health_check_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Load Balancer Members
CREATE TABLE load_balancer_members (
    id SERIAL PRIMARY KEY,
    load_balancer_id INTEGER REFERENCES load_balancer_configs(id) ON DELETE CASCADE,
    proxy_destination_id INTEGER REFERENCES proxy_destinations(id) ON DELETE CASCADE,
    weight INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_proxy_logs_api_key_id ON proxy_logs(api_key_id);
CREATE INDEX idx_proxy_logs_destination_id ON proxy_logs(proxy_destination_id);
CREATE INDEX idx_proxy_logs_started_at ON proxy_logs(started_at);
CREATE INDEX idx_api_key_proxy_mappings_api_key ON api_key_proxy_mappings(api_key_id);
CREATE INDEX idx_api_key_proxy_mappings_destination ON api_key_proxy_mappings(proxy_destination_id);
CREATE INDEX idx_proxy_destinations_status ON proxy_destinations(status);
CREATE INDEX idx_proxy_health_checks_destination ON proxy_health_checks(proxy_destination_id);
CREATE INDEX idx_proxy_health_checks_checked_at ON proxy_health_checks(checked_at);

-- Sample data
INSERT INTO proxy_destinations (name, description, base_url, auth_type) VALUES
('JSONPlaceholder API', 'Test API for demo', 'https://jsonplaceholder.typicode.com', 'none'),
('Internal User Service', 'Internal microservice for users', 'http://localhost:8001/api', 'bearer'),
('Payment Gateway', 'Payment processing service', 'https://api.payment.com/v2', 'api_key');

-- Sample proxy mappings (will be created via API after API keys exist)
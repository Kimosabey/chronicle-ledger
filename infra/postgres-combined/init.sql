-- ChronicleLedger Database Schema (PostgreSQL)
-- Combined Event Store + Read Model

-- ====================
-- EVENT STORE TABLES
-- ====================

-- Events table (append-only event log)
CREATE TABLE IF NOT EXISTS events (
    event_id BIGSERIAL PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    event_version INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    metadata JSONB
);

CREATE INDEX idx_events_aggregate ON events(aggregate_id, event_version);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created ON events(created_at DESC);

-- Aggregate versions (for optimistic locking)
CREATE TABLE IF NOT EXISTS aggregate_versions (
    aggregate_id UUID PRIMARY KEY,
    current_version INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Idempotency keys (prevent duplicate writes)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- ====================
-- READ MODEL TABLES
-- ====================

-- Account balances (materialized view)
CREATE TABLE IF NOT EXISTS account_balance (
    account_id VARCHAR(255) PRIMARY KEY,
    owner_name VARCHAR(255) NOT NULL,
    balance DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_account_owner ON account_balance(owner_name);
CREATE INDEX idx_account_status ON account_balance(status);

-- Transaction history (denormalized)
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id UUID PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL REFERENCES account_balance(account_id),
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    balance_after DECIMAL(20, 2) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_account ON transactions(account_id, timestamp DESC);
CREATE INDEX idx_transactions_type ON transactions(type);

-- Transfers (link between accounts)
CREATE TABLE IF NOT EXISTS transfers (
    transfer_id UUID PRIMARY KEY,
    from_account_id VARCHAR(255) NOT NULL REFERENCES account_balance(account_id),
    to_account_id VARCHAR(255) NOT NULL REFERENCES account_balance(account_id),
    amount DECIMAL(20, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transfers_from ON transfers(from_account_id);
CREATE INDEX idx_transfers_to ON transfers(to_account_id);

-- Event processing position (track last processed event)
CREATE TABLE IF NOT EXISTS event_position (
    processor_name VARCHAR(100) PRIMARY KEY,
    last_event_id BIGINT NOT NULL,
    last_processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial position
INSERT INTO event_position (processor_name, last_event_id) 
VALUES ('read_processor', 0)
ON CONFLICT (processor_name) DO NOTHING;

COMMENT ON TABLE events IS 'Append-only event log (Event Store)';
COMMENT ON TABLE account_balance IS 'Materialized view of current account state';
COMMENT ON TABLE transactions IS 'Denormalized transaction history for fast queries';
COMMENT ON TABLE event_position IS 'Tracks last processed event for read model updates';

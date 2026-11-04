-- ==============================================================================
-- Keshav Database Schema (PostgreSQL)
-- Tables: Leads, FactSheet, VisitSlots
-- ==============================================================================

-- Drop tables if exists (for clean re-migration if desired)
-- DROP TABLE IF EXISTS leads CASCADE;
-- DROP TABLE IF EXISTS visit_slots CASCADE;
-- DROP TABLE IF EXISTS fact_sheet CASCADE;

-- 1. FactSheet Table
CREATE TABLE IF NOT EXISTS fact_sheet (
    project_id VARCHAR(100) PRIMARY KEY,
    rera_number VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    pricing VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. VisitSlots Table
CREATE TABLE IF NOT EXISTS visit_slots (
    id SERIAL PRIMARY KEY,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_until TIMESTAMP WITH TIME ZONE NULL,
    project_id VARCHAR(100) REFERENCES fact_sheet(project_id) ON DELETE SET NULL,
    reminder_24h_sent BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_2h_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on visit slot booking & datetime
CREATE INDEX IF NOT EXISTS idx_visit_slots_date_time ON visit_slots(date_time);
CREATE INDEX IF NOT EXISTS idx_visit_slots_is_booked ON visit_slots(is_booked);

-- 3. Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    source VARCHAR(100),
    preferred_bhk VARCHAR(50),
    budget VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'New',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    project_id VARCHAR(100) REFERENCES fact_sheet(project_id) ON DELETE SET NULL,
    slot_id INT REFERENCES visit_slots(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on phone for lightning-fast duplicate checking and merging
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- 4. Chat Transcripts Table (for Executive Inbox split-screen view)
CREATE TABLE IF NOT EXISTS chat_transcripts (
    id SERIAL PRIMARY KEY,
    lead_id INT REFERENCES leads(id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'executive'
    text TEXT NOT NULL,
    tool_calls TEXT NULL,
    is_promotional BOOLEAN DEFAULT FALSE,
    rera_number VARCHAR(100) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_transcripts_lead_id ON chat_transcripts(lead_id);

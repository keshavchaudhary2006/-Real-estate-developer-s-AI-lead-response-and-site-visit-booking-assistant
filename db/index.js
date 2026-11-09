const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// File path for standalone / offline fallback storage
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db-store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// PostgreSQL Connection Pool configuration
const isCloudDb = Boolean(
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes('localhost') &&
  !process.env.DATABASE_URL.includes('127.0.0.1')
);

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isCloudDb || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgrespassword',
      database: process.env.PGDATABASE || 'keshav_db',
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
    };

// Add short timeout so it fails fast if Postgres server is not running
poolConfig.connectionTimeoutMillis = 3000;

let pool = null;
let usePostgres = false;
let dbInitialized = false;

// Mock seed data matching the prompt specifications
const initialSeedData = {
  fact_sheet: [
    {
      project_id: 'Project 1',
      rera_number: 'PRM/KA/RERA/1251/310/PR/210101/004001',
      details: 'Keshav Sky Villas - Ultra luxury 3 & 4 BHK residences with rooftop infinity pool, clubhouse and smart home automation.',
      pricing: 'Starting from ₹1.25 Cr',
      created_at: new Date('2026-10-01T09:00:00Z').toISOString(),
      updated_at: new Date('2026-10-01T09:00:00Z').toISOString(),
    },
    {
      project_id: 'Project 2',
      rera_number: 'PRM/KA/RERA/1251/308/PR/210215/004050',
      details: 'Keshav Urban Heights - Modern 2 & 3 BHK eco-friendly homes with metro connectivity and 40+ lifestyle amenities.',
      pricing: 'Starting from ₹75 Lakhs',
      created_at: new Date('2026-10-01T09:00:00Z').toISOString(),
      updated_at: new Date('2026-10-01T09:00:00Z').toISOString(),
    },
  ],
  visit_slots: [
    {
      id: 1,
      date_time: '2026-11-01T11:00:00.000Z',
      is_booked: true,
      locked_until: null,
      project_id: 'Project 1',
      reminder_24h_sent: false,
      reminder_2h_sent: false,
      created_at: new Date('2026-10-20T10:00:00Z').toISOString(),
    },
    {
      id: 2,
      date_time: '2026-11-10T10:00:00.000Z',
      is_booked: false,
      locked_until: null,
      project_id: 'Project 1',
      reminder_24h_sent: false,
      reminder_2h_sent: false,
      created_at: new Date('2026-10-20T10:00:00Z').toISOString(),
    },
    {
      id: 3,
      date_time: '2026-11-10T14:30:00.000Z',
      is_booked: false,
      locked_until: null,
      project_id: 'Project 2',
      reminder_24h_sent: false,
      reminder_2h_sent: false,
      created_at: new Date('2026-10-20T10:00:00Z').toISOString(),
    },
    {
      id: 4,
      date_time: '2026-11-12T16:00:00.000Z',
      is_booked: false,
      locked_until: null,
      project_id: 'Project 2',
      reminder_24h_sent: false,
      reminder_2h_sent: false,
      created_at: new Date('2026-10-20T10:00:00Z').toISOString(),
    },
  ],
  leads: [
    {
      id: 1,
      name: 'Hardik Patel',
      phone: '+91 98765 43210',
      source: 'Property portal',
      preferred_bhk: '3 BHK',
      budget: '₹1.25 Cr - 1.50 Cr',
      status: 'Booked',
      created_at: new Date('2026-10-25T11:00:00Z').toISOString(),
      project_id: 'Project 1',
      slot_id: 1,
      updated_at: new Date('2026-10-25T11:00:00Z').toISOString(),
    },
    {
      id: 2,
      name: 'Nidhi Shah',
      phone: '+91 98220 11223',
      source: 'Social media ad',
      preferred_bhk: '2 BHK',
      budget: '₹75 L - 90 L',
      status: 'Not booked',
      created_at: new Date('2026-10-28T14:15:00Z').toISOString(),
      project_id: 'Project 2',
      slot_id: null,
      updated_at: new Date('2026-10-28T14:15:00Z').toISOString(),
    },
    {
      id: 3,
      name: 'Kavita Joshi',
      phone: '+91 97112 33445',
      source: 'Hoarding call',
      preferred_bhk: '2 BHK',
      budget: '₹80 L - 95 L',
      status: 'Visited',
      created_at: new Date('2026-10-29T16:45:00Z').toISOString(),
      project_id: 'Project 2',
      slot_id: null,
      updated_at: new Date('2026-10-29T16:45:00Z').toISOString(),
    },
  ],
  chat_transcripts: [
    {
      id: 1,
      lead_id: 1,
      sender: 'user',
      text: "Hi, I saw Project 1 on a property portal. I'm looking for a luxury 3 BHK.",
      tool_calls: null,
      is_promotional: false,
      created_at: new Date('2026-10-25T10:55:00Z').toISOString(),
    },
    {
      id: 2,
      lead_id: 1,
      sender: 'assistant',
      text: "Welcome to Keshav Private Advisory. Project 1: Keshav Sky Villas features ultra-luxury 3 & 4 BHK residences starting from ₹1.25 Cr with rooftop infinity pool and smart home automation.\n\n──────────────────────────────\n🏛️ Official RERA Registration Number: PRM/KA/RERA/1251/310/PR/210101/004001\n📌 Project: Project 1 | Verified on Karnataka Real Estate Regulatory Authority portal",
      tool_calls: JSON.stringify([{ tool: 'get_factsheet_data', args: { project_id: 'Project 1' } }]),
      is_promotional: true,
      rera_number: 'PRM/KA/RERA/1251/310/PR/210101/004001',
      created_at: new Date('2026-10-25T10:56:00Z').toISOString(),
    },
    {
      id: 3,
      lead_id: 1,
      sender: 'user',
      text: "My budget is around 1.3 to 1.5 Cr. Can I book a site visit slot?",
      tool_calls: null,
      is_promotional: false,
      created_at: new Date('2026-10-25T10:58:00Z').toISOString(),
    },
    {
      id: 4,
      lead_id: 1,
      sender: 'assistant',
      text: "✨ Availability Confirmed for 3 BHK within ₹1.25 Cr - 1.50 Cr:\n\n• Project 1: Starting from ₹1.25 Cr — Ultra luxury 3 & 4 BHK residences.\n\n🗓️ Open Site Visit Slot:\n• Slot #1: Nov 1, 2026 at 11:00 AM\n\n──────────────────────────────\n🏛️ Official RERA Registration Number: PRM/KA/RERA/1251/310/PR/210101/004001",
      tool_calls: JSON.stringify([{ tool: 'check_availability', args: { preferred_bhk: '3 BHK', budget: '₹1.25 - 1.50 Cr', project_id: 'Project 1' } }]),
      is_promotional: true,
      rera_number: 'PRM/KA/RERA/1251/310/PR/210101/004001',
      created_at: new Date('2026-10-25T10:59:00Z').toISOString(),
    },
    {
      id: 5,
      lead_id: 1,
      sender: 'user',
      text: "Yes, please confirm Slot #1. Phone: +91 98765 43210, Name: Hardik Patel.",
      tool_calls: null,
      is_promotional: false,
      created_at: new Date('2026-10-25T11:00:00Z').toISOString(),
    },
    {
      id: 6,
      lead_id: 1,
      sender: 'assistant',
      text: "🎉 Site Visit Confirmed! Slot #1 on Nov 1, 2026 at 11:00 AM for Project 1 has been successfully booked for Hardik Patel (+91 98765 43210).\n\n──────────────────────────────\n🏛️ Official RERA Registration Number: PRM/KA/RERA/1251/310/PR/210101/004001",
      tool_calls: null,
      is_promotional: true,
      rera_number: 'PRM/KA/RERA/1251/310/PR/210101/004001',
      created_at: new Date('2026-10-25T11:00:30Z').toISOString(),
    },
    {
      id: 7,
      lead_id: 2,
      sender: 'user',
      text: "Saw your social media ad for Project 2. Are 2 BHK units available?",
      tool_calls: null,
      is_promotional: false,
      created_at: new Date('2026-10-28T14:10:00Z').toISOString(),
    },
    {
      id: 8,
      lead_id: 2,
      sender: 'assistant',
      text: "Project 2 (Keshav Urban Heights) has modern 2 & 3 BHK eco-friendly homes starting from ₹75 Lakhs with metro connectivity.\n\n──────────────────────────────\n🏛️ Official RERA Registration Number: PRM/KA/RERA/1251/308/PR/210215/004050",
      tool_calls: JSON.stringify([{ tool: 'get_factsheet_data', args: { project_id: 'Project 2' } }]),
      is_promotional: true,
      rera_number: 'PRM/KA/RERA/1251/308/PR/210215/004050',
      created_at: new Date('2026-10-28T14:11:00Z').toISOString(),
    },
    {
      id: 9,
      lead_id: 2,
      sender: 'user',
      text: "Can I get a 10% discount on the 2 BHK unit?",
      tool_calls: null,
      is_promotional: false,
      created_at: new Date('2026-10-28T14:14:00Z').toISOString(),
    },
    {
      id: 10,
      lead_id: 2,
      sender: 'assistant',
      text: "A sales executive will confirm this detail for you. Would you like to schedule a site visit in the meantime?\n\n──────────────────────────────\n🏛️ Official RERA Registration Number: PRM/KA/RERA/1251/308/PR/210215/004050",
      tool_calls: JSON.stringify([{ tool: 'human_handoff', args: { reason: 'final_price_or_discount_request', user_query: 'Can I get a 10% discount on the 2 BHK unit?' } }]),
      is_promotional: true,
      rera_number: 'PRM/KA/RERA/1251/308/PR/210215/004050',
      created_at: new Date('2026-10-28T14:15:00Z').toISOString(),
    },
    {
      id: 11,
      lead_id: 3,
      sender: 'user',
      text: "Calling from your hoarding ad near the highway. I want a 2 BHK in Project 2.",
      tool_calls: null,
      is_promotional: false,
      created_at: new Date('2026-10-29T16:40:00Z').toISOString(),
    },
    {
      id: 12,
      lead_id: 3,
      sender: 'assistant',
      text: "Welcome! Project 2 (Keshav Urban Heights) has 2 & 3 BHK homes with 40+ lifestyle amenities starting from ₹75 Lakhs.\n\n──────────────────────────────\n🏛️ Official RERA Registration Number: PRM/KA/RERA/1251/308/PR/210215/004050",
      tool_calls: JSON.stringify([{ tool: 'get_factsheet_data', args: { project_id: 'Project 2' } }]),
      is_promotional: true,
      rera_number: 'PRM/KA/RERA/1251/308/PR/210215/004050',
      created_at: new Date('2026-10-29T16:41:00Z').toISOString(),
    },
    {
      id: 13,
      lead_id: 3,
      sender: 'user',
      text: "I visited the site office yesterday with my family. Can you share the payment schedule?",
      tool_calls: null,
      is_promotional: false,
      created_at: new Date('2026-10-29T16:44:00Z').toISOString(),
    },
    {
      id: 14,
      lead_id: 3,
      sender: 'assistant',
      text: "A sales executive will confirm this detail for you. Would you like to schedule a site visit in the meantime?\n\n──────────────────────────────\n🏛️ Official RERA Registration Number: PRM/KA/RERA/1251/308/PR/210215/004050",
      tool_calls: JSON.stringify([{ tool: 'human_handoff', args: { reason: 'unknown_factsheet_query', user_query: 'payment schedule' } }]),
      is_promotional: true,
      rera_number: 'PRM/KA/RERA/1251/308/PR/210215/004050',
      created_at: new Date('2026-10-29T16:45:00Z').toISOString(),
    },
  ],
};

// Standalone Store Manager (Fallback if Postgres is offline)
class StandaloneStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = this.readData();
  }

  readData() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[DB Fallback] Failed reading file store, re-initializing.');
    }
    const fresh = JSON.parse(JSON.stringify(initialSeedData));
    this.writeData(fresh);
    return fresh;
  }

  writeData(data) {
    this.data = data;
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('[DB Fallback] Write error:', e);
    }
  }

  reset() {
    const fresh = JSON.parse(JSON.stringify(initialSeedData));
    this.writeData(fresh);
    return fresh;
  }

  getTable(name) {
    if (!this.data[name]) {
      this.data[name] = [];
    }
    return this.data[name];
  }
}

const localStore = new StandaloneStore(DATA_FILE);

/**
 * Initialize DB: Tests PostgreSQL connection.
 * If accessible, applies schema DDL and seeds if empty.
 * If not accessible, falls back seamlessly to the standalone persistent storage.
 */
async function initDb() {
  if (dbInitialized) {
    return { mode: usePostgres ? 'postgresql' : 'standalone-fallback' };
  }

  try {
    pool = new Pool(poolConfig);
    const client = await pool.connect();
    usePostgres = true;
    console.log('[DB] Successfully connected to PostgreSQL instance.');

    // Apply schema DDL
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('[DB] PostgreSQL schema initialized successfully.');
    }

    // Check if tables are empty; if so, seed them
    const leadsCheck = await client.query('SELECT COUNT(*) FROM leads');
    if (parseInt(leadsCheck.rows[0].count, 10) === 0) {
      console.log('[DB] Leads table empty in PostgreSQL. Auto-seeding mock data...');
      await seedDb();
    }

    client.release();
  } catch (err) {
    console.warn(`[DB] PostgreSQL connection failed (${err.message}). Activating standalone storage engine.`);
    usePostgres = false;
    // Ensure local store has seed data
    if (!localStore.getTable('leads').length) {
      localStore.reset();
    }
  }

  dbInitialized = true;
  return { mode: usePostgres ? 'postgresql' : 'standalone-fallback' };
}

/**
 * Seed the database with the mock data:
 * - Hardik Patel (Property portal, Project 1, 3 BHK, Booked 2026-11-01 11:00)
 * - Nidhi Shah (Social media ad, Project 2, 2 BHK, Not booked)
 * - Kavita Joshi (Hoarding call, Project 2, 2 BHK, Visited)
 * plus FactSheet and VisitSlots.
 */
async function seedDb() {
  if (usePostgres && pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Clear existing records
      await client.query('DELETE FROM leads');
      await client.query('DELETE FROM visit_slots');
      await client.query('DELETE FROM fact_sheet');

      // 1. Seed FactSheet
      for (const fsItem of initialSeedData.fact_sheet) {
        await client.query(
          `INSERT INTO fact_sheet (project_id, rera_number, details, pricing, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (project_id) DO UPDATE 
           SET rera_number = EXCLUDED.rera_number, details = EXCLUDED.details, pricing = EXCLUDED.pricing`,
          [fsItem.project_id, fsItem.rera_number, fsItem.details, fsItem.pricing, fsItem.created_at, fsItem.updated_at]
        );
      }

      // 2. Seed VisitSlots
      for (const slot of initialSeedData.visit_slots) {
        await client.query(
          `INSERT INTO visit_slots (id, date_time, is_booked, locked_until, project_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE
           SET date_time = EXCLUDED.date_time, is_booked = EXCLUDED.is_booked, locked_until = EXCLUDED.locked_until`,
          [slot.id, slot.date_time, slot.is_booked, slot.locked_until, slot.project_id, slot.created_at]
        );
      }
      // Reset sequence for visit_slots
      await client.query(`SELECT setval(pg_get_serial_sequence('visit_slots', 'id'), COALESCE(MAX(id), 1)) FROM visit_slots`);

      // 3. Seed Leads
      for (const lead of initialSeedData.leads) {
        await client.query(
          `INSERT INTO leads (id, name, phone, source, preferred_bhk, budget, status, created_at, project_id, slot_id, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name, phone = EXCLUDED.phone, source = EXCLUDED.source, 
               preferred_bhk = EXCLUDED.preferred_bhk, budget = EXCLUDED.budget, status = EXCLUDED.status`,
          [lead.id, lead.name, lead.phone, lead.source, lead.preferred_bhk, lead.budget, lead.status, lead.created_at, lead.project_id, lead.slot_id, lead.updated_at]
        );
      }
      // Reset sequence for leads
      await client.query(`SELECT setval(pg_get_serial_sequence('leads', 'id'), COALESCE(MAX(id), 1)) FROM leads`);

      await client.query('COMMIT');
      console.log('[DB] Seed completed in PostgreSQL.');
      return { success: true, mode: 'postgresql', count: initialSeedData.leads.length };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    // Standalone fallback seed
    localStore.reset();
    console.log('[DB] Seed completed in Standalone Storage.');
    return { success: true, mode: 'standalone-fallback', count: initialSeedData.leads.length };
  }
}

/**
 * Executes a PostgreSQL query if connected, otherwise forwards to fallback store handler
 */
async function query(text, params = []) {
  if (usePostgres && pool) {
    return pool.query(text, params);
  }
  throw new Error('PostgreSQL not connected. Use high-level repository services.');
}

function getMode() {
  return usePostgres ? 'postgresql' : 'standalone-fallback';
}

module.exports = {
  pool,
  initDb,
  seedDb,
  query,
  getMode,
  localStore,
  initialSeedData,
};

# Keshav 🚀
### Real Estate Developer AI Lead Response, Site Visit Booking & Executive Suite
Built with **Next.js 14 (React)**, **Node.js Express Backend**, and **PostgreSQL**.

---

## 🌟 Complete Feature Suite

### 1. Core Relational Database & Duplicate Phone Merge
- **PostgreSQL Relational Schema**: Clean relational schema comprising `leads`, `fact_sheet`, `visit_slots`, and `chat_transcripts`.
- **Intelligent Duplicate Check & Merge Logic**: Automatically normalizes diverse phone formats (`+91 98765 43210`, `9876543210`, `98765-43210`). Merges re-inquiring buyers with their existing record, preserving lead history, updating BHK/budget requirements, and preventing redundant rows.
- **Dual-Mode Storage Engine**: Native connection to PostgreSQL via `pg` pool, with seamless standalone storage fallback when offline.
- **Seeded Real-World Mock Data**: Pre-loaded with Hardik Patel (Property portal, 3 BHK, Booked), Nidhi Shah (Social media ad, 2 BHK, Not booked), and Kavita Joshi (Hoarding call, 2 BHK, Visited).

---

### 2. Mobile-First Buyer Web Chat Interface (`/chat`)
- **Architectural Minimalism**: Generous whitespace, restrained monochromatic palette, clear typography, and zero UI clutter.
- **Statutory DPDP Act 2023 Compliance**:
  - Upfront personal data processing consent banner before processing buyer contact information.
  - Interactive opt-out protocol: typing `"STOP"` immediately purges marketing preferences; typing `"START"` restores consent.
- **Multilingual Conversational Engine**: Seamless support across **English**, **Hindi (हिन्दी)**, and **Gujarati (ગુજરાતી)**.
- **Mandatory RERA Appending**: Every promotional message automatically appends the project's official statutory RERA registration number at the bottom.

---

### 3. Autonomous AI Agent with Tool Calling & Strict Guardrails
- **FactSheet Strict Guardrail**: The AI answers queries **ONLY** using verified specifications from the `FactSheet` table.
- **Automated Human Handoff**: If a user asks a query outside the FactSheet (e.g. elevator brands, maintenance charges) OR asks for discounts / price negotiations:
  - Replies: *"A sales executive will confirm this detail for you. Would you like to schedule a site visit in the meantime?"*
  - Automatically executes the `human_handoff` tool with contextual logging.
- **Conversational Goal Extraction**: Actively extracts `preferred_bhk` (e.g. 2 BHK, 3 BHK) and `budget` (e.g. ₹1.5 Cr).
- **`check_availability` Tool Calling**: Once both BHK and budget goals are resolved, the AI triggers the `check_availability` tool to verify matching units and open visit slots.

---

### 4. Site-Visit Scheduler & Background Reminder Cron
- **Interactive Calendar UI**: Surfaces real-time available visit slots from the `visit_slots` table.
- **2-Minute Temporary Lock (Double-Booking Prevention)**:
  - Clicking a slot applies a 2-minute temporary lock (`locked_until`) on the database row.
  - Concurrent lock attempts by other buyers are strictly rejected.
  - Expired locks are released automatically; confirmed bookings update status to `is_booked = true`.
- **Background Mock Reminder Cron Job**:
  - Scans for upcoming visits and dispatches reminders **24 hours** and **2 hours** before the booked timestamp.
  - Compliant with DPDP Act notice standards and RERA disclosures.

---

### 5. Sales Executive Unified Lead Inbox (`/inbox`)
- **Pipeline List with Source & Subtle Status Tags**:
  - Displays all leads with normalized source tags: `Portal`, `Ads`, `Hoarding`, and `Direct`.
  - Subtle accent colors strictly reserved for status categories:
    - `Hot` (`Booked`): Soft emerald tint (`bg-emerald-50 text-emerald-800 border-emerald-200`)
    - `Visited`: Soft sky tint (`bg-sky-50 text-sky-800 border-sky-200`)
    - `Cold` (`Not booked`): Soft stone tint (`bg-stone-100 text-stone-700 border-stone-200`)
- **Split-Screen Workspace**:
  - **Left Pane — Structured Lead Data**: Buyer profile, contact with one-click copy, target budget, preferred BHK, DPDP consent status, visit slot timestamp, and project RERA details.
  - **Right Pane — Full AI Chat Transcript**: Chronological conversation history showing buyer messages, AI responses with tool call badges, and statutory RERA notices.
- **Prominent 'Take Over Chat' Button**:
  - Toggles takeover status to pause autonomous AI responses and place the senior residential advisor in direct control.
  - Includes a live message composer for real-time executive intervention, with the option to release control back to AI.

---

### 6. Sales Head Executive Suite (`/admin`)
- **Admin Editor CMS (`/admin/cms`)**:
  - **FactSheet Table Editor**: In-place text editing for project `details`, `pricing`, and `rera_number`. Edits take immediate effect in the AI assistant's memory.
  - **Visit Slots Inventory**: Complete management of calendar slots, lock status countdowns, manual lock releases, and booking toggles.
- **High-Level Performance Dashboard (`/admin/performance`)**:
  - **Median First Response Time (Target < 5 mins)**: Tracks duration from inquiry to first outreach, displaying compliance against the < 5.0m SLA target.
  - **Percentage of Leads Not Reached in 48 Hours**: Monitors SLA compliance against an industry benchmark threshold of $\le 10\%$.
  - **Lead-to-Visit Conversion Rate**: Displays conversion funnel stages from initial inquiry to confirmed site visit.
  - **Cost-Per-Visit Segmented by Source (₹1,000/lead assumption)**:
    - Calculates spend as $\text{Leads} \times ₹1,000$.
    - Segmented breakdown of volume, spend, visits, and Cost-Per-Visit (CPV) across `Portal`, `Ads`, `Hoarding`, and `Direct`.

---

## 📊 Core Database Schema

```
┌────────────────────────────────┐         ┌────────────────────────────────┐
│           FactSheet            │         │           VisitSlots           │
├────────────────────────────────┤         ├────────────────────────────────┤
│ PK  project_id  (VARCHAR)      │◄───┐     │ PK  id          (SERIAL)       │◄───┐
│     rera_number (VARCHAR)      │    │     │     date_time   (TIMESTAMPTZ)  │    │
│     details     (TEXT)         │    │     │     is_booked   (BOOLEAN)      │    │
│     pricing     (VARCHAR)      │    │     │     locked_until(TIMESTAMPTZ)  │    │
│     created_at  (TIMESTAMPTZ)  │    │     │ FK  project_id  (VARCHAR)      │    │
│     updated_at  (TIMESTAMPTZ)  │    │     │     reminder_24h(BOOLEAN)      │    │
└────────────────────────────────┘    │     │     reminder_2h (BOOLEAN)      │    │
                                      │     └────────────────────────────────┘    │
                                      │                                           │
                         ┌────────────┴───────────────────┐                       │
                         │             Leads              │                       │
                         ├────────────────────────────────┤                       │
                         │ PK  id            (SERIAL)     │                       │
                         │     name          (VARCHAR)    │                       │
                         │     phone         (VARCHAR)    │ (Unique/Normalized)   │
                         │     source        (VARCHAR)    │                       │
                         │     preferred_bhk (VARCHAR)    │                       │
                         │     budget        (VARCHAR)    │                       │
                         │     status        (VARCHAR)    │                       │
                         │     created_at    (TIMESTAMPTZ)│                       │
                         │ FK  project_id    (VARCHAR)────┘                       │
                         │ FK  slot_id       (INT)────────────────────────────────┘
                         └────────────────────────────────┘
                                      ▲
                                      │
                         ┌────────────┴───────────────────┐
                         │        ChatTranscripts         │
                         ├────────────────────────────────┤
                         │ PK  id            (SERIAL)     │
                         │ FK  lead_id       (INT)        │
                         │     sender        (VARCHAR)    │ (user/assistant/exec)
                         │     text          (TEXT)       │
                         │     tool_calls    (JSONB/TEXT) │
                         │     is_promotional(BOOLEAN)    │
                         │     rera_number   (VARCHAR)    │
                         │     created_at    (TIMESTAMPTZ)│
                         └────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Installation
```bash
git clone https://github.com/keshavchaudhary2006/-Real-estate-developer-s-AI-lead-response-and-site-visit-booking-assistant.git
cd -Real-estate-developer-s-AI-lead-response-and-site-visit-booking-assistant
npm install
```

### 2. Run All Automated Test Suites
```bash
npm test
```
Executes all **7 test suites** covering API, duplicate merge, buyer chat, agent guardrails, 2-minute locks, reminder cron, sales inbox, and performance analytics.

### 3. Running PostgreSQL via Docker (Optional)
```bash
docker compose up -d
```
Boots PostgreSQL 16 on port `5432` and applies `db/schema.sql`.

### 4. Running the Development Server
```bash
npm run dev
```
Open in browser:
- `http://localhost:3000` — Admin CRM & Relational DB Explorer
- `http://localhost:3000/chat` — Mobile-First Buyer Web Chat (DPDP, Multilingual, RERA)
- `http://localhost:3000/inbox` — Sales Executive Unified Lead Inbox with Chat Takeover
- `http://localhost:3000/admin/cms` — Sales Head FactSheet & Visit Slot CMS Editor
- `http://localhost:3000/admin/performance` — Sales Head High-Level Performance Dashboard

---

## 📂 Project Directory Structure

```
Keshav/
├── app/                              # Next.js 14 App Router
│   ├── admin/
│   │   ├── cms/page.tsx              # FactSheet & Visit Slots Editor CMS
│   │   ├── performance/page.tsx      # High-Level Performance Dashboard
│   │   └── page.tsx                  # Sales Head portal redirect
│   ├── api/                          # Serverless Route Handlers
│   │   ├── analytics/performance/    # Sales Head metrics endpoint
│   │   ├── chat/                     # Buyer chat API with DPDP & RERA
│   │   ├── factsheet/                # FactSheet CRUD
│   │   ├── health/                   # System health & DB mode
│   │   ├── inbox/                    # Executive inbox, takeover & messages
│   │   ├── leads/                    # Leads CRUD & duplicate merge
│   │   ├── reminders/                # Background reminder cron endpoints
│   │   ├── seed/                     # Database reseed endpoint
│   │   └── slots/                    # Visit slots, 2m lock & booking
│   ├── chat/
│   │   ├── SiteVisitScheduler.tsx    # 2-minute lock calendar UI
│   │   └── page.tsx                  # Mobile buyer chat interface
│   ├── inbox/
│   │   └── page.tsx                  # Sales executive unified lead inbox
│   ├── globals.css                   # Tailwind styles
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Admin CRM dashboard
├── db/
│   ├── index.js                      # Dual-mode PostgreSQL / standalone storage
│   └── schema.sql                    # Relational schema DDL
├── scripts/
│   ├── seed.js                       # Seeder script
│   ├── test-agent-guardrails.js      # Agent guardrails & tool calling tests
│   ├── test-analytics.js             # Sales Head metrics tests
│   ├── test-api.js                   # CRUD & duplicate phone merge tests
│   ├── test-chat.js                  # DPDP, multilingual & RERA tests
│   ├── test-express-routes.js        # Express route handler tests
│   ├── test-inbox.js                 # Unified inbox & takeover tests
│   └── test-scheduling-cron.js       # 2m lock & reminder cron tests
├── server/
│   ├── controllers/                  # Express controllers
│   ├── jobs/                         # Background reminder cron job
│   ├── routes/                       # Express router definitions
│   ├── services/                     # Business logic services
│   └── index.js                      # Node.js Express server
├── .env.example                      # Environment variables template
├── .gitignore                        # Git exclusion rules
├── docker-compose.yml                # PostgreSQL container definition
├── LICENSE                           # MIT License
├── package.json                      # Project dependencies & scripts
└── README.md                         # Project documentation
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.


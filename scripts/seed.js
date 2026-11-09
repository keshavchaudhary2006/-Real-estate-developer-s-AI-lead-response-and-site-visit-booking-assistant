const db = require('../db');

async function runSeed() {
  console.log('--- Keshav Database Seeder ---');
  try {
    const status = await db.initDb();
    console.log(`Database connected in [${status.mode.toUpperCase()}] mode.`);

    const res = await db.seedDb();
    console.log('Seeding successful:', res);

    // Fetch and display seeded data
    const leadService = require('../server/services/leadService');
    const factSheetService = require('../server/services/factSheetService');
    const slotsService = require('../server/services/slotsService');

    const leads = await leadService.getAllLeads();
    const factSheets = await factSheetService.getAllFactSheets();
    const slots = await slotsService.getAllSlots();

    console.log('\n--- SEEDED FACT SHEETS ---');
    console.table(
      factSheets.map((f) => ({
        Project: f.project_id,
        RERA: f.rera_number,
        Pricing: f.pricing,
        Details: f.details.slice(0, 45) + '...',
      }))
    );

    console.log('\n--- SEEDED VISIT SLOTS ---');
    console.table(
      slots.map((s) => ({
        ID: s.id,
        Project: s.project_id,
        DateTime: s.date_time,
        IsBooked: s.is_booked,
        LockedUntil: s.locked_until || 'None',
      }))
    );

    console.log('\n--- SEEDED LEADS ---');
    console.table(
      leads.map((l) => ({
        ID: l.id,
        Name: l.name,
        Phone: l.phone,
        Source: l.source,
        Project: l.project_id,
        BHK: l.preferred_bhk,
        Budget: l.budget,
        Status: l.status,
      }))
    );

    console.log('\n✅ Database seeding completed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

runSeed();

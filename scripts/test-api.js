const assert = require('assert');
const leadService = require('../server/services/leadService');
const factSheetService = require('../server/services/factSheetService');
const slotsService = require('../server/services/slotsService');
const db = require('../db');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Keshav API & Business Logic Tests');
  console.log('====================================================\n');

  await db.initDb();
  await db.seedDb();

  let passedCount = 0;
  let testCount = 0;

  function test(name, fn) {
    testCount++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  async function testAsync(name, fn) {
    testCount++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  // 1. Check Initial Seed Data
  await testAsync('1. Seed Data: All 3 initial mock leads exist', async () => {
    const leads = await leadService.getAllLeads();
    assert(leads.length >= 3, `Expected at least 3 leads, found ${leads.length}`);
    const hardik = leads.find((l) => l.name === 'Hardik Patel');
    const nidhi = leads.find((l) => l.name === 'Nidhi Shah');
    const kavita = leads.find((l) => l.name === 'Kavita Joshi');

    assert(hardik, 'Hardik Patel must exist');
    assert.strictEqual(hardik.source, 'Property portal');
    assert.strictEqual(hardik.preferred_bhk, '3 BHK');
    assert.strictEqual(hardik.status, 'Booked');

    assert(nidhi, 'Nidhi Shah must exist');
    assert.strictEqual(nidhi.source, 'Social media ad');
    assert.strictEqual(nidhi.status, 'Not booked');

    assert(kavita, 'Kavita Joshi must exist');
    assert.strictEqual(kavita.source, 'Hoarding call');
    assert.strictEqual(kavita.status, 'Visited');
  });

  // 2. FactSheet Verification
  await testAsync('2. FactSheet: Core project facts exist', async () => {
    const sheets = await factSheetService.getAllFactSheets();
    assert(sheets.length >= 2, 'Expected at least 2 fact sheets');
    const p1 = sheets.find((s) => s.project_id === 'Project 1');
    assert(p1, 'Project 1 must exist');
    assert(p1.rera_number.includes('PRM/KA/RERA'), 'RERA number must be valid');
    assert(p1.pricing.includes('1.25 Cr'), 'Pricing must match');
  });

  // 3. VisitSlots Verification
  await testAsync('3. VisitSlots: Hardik Patel booking slot exists and is booked', async () => {
    const slot = await slotsService.getSlotById(1);
    assert(slot, 'Slot #1 must exist');
    assert.strictEqual(slot.is_booked, true, 'Slot #1 must be booked');
    assert(slot.date_time.includes('2026-11-01'), 'Slot #1 date must be 2026-11-01');
  });

  // 4. Duplicate Check & Merge Logic: Same Phone Number in Different Format
  await testAsync('4. Duplicate Check: Merges lead when phone matches (+91 format vs unformatted)', async () => {
    const countBefore = (await leadService.getAllLeads()).length;

    // Hardik Patel's phone is '+91 98765 43210'.
    // Submitting with clean digits '9876543210' and updated budget & preferred BHK
    const mergeAttempt = await leadService.createOrMergeLead({
      name: 'Hardik Patel Updated',
      phone: '9876543210', // unformatted variant
      source: 'Direct Website Referral',
      preferred_bhk: '3.5 BHK',
      budget: '₹1.60 Cr',
      status: 'Booked',
      project_id: 'Project 1',
    });

    assert.strictEqual(mergeAttempt.merged, true, 'Should detect duplicate and flag merged: true');
    assert.strictEqual(mergeAttempt.lead.id, 1, 'Should retain Hardik Patel ID #1');
    assert.strictEqual(mergeAttempt.lead.preferred_bhk, '3.5 BHK', 'Should update preferred BHK');
    assert.strictEqual(mergeAttempt.lead.budget, '₹1.60 Cr', 'Should update budget');

    const countAfter = (await leadService.getAllLeads()).length;
    assert.strictEqual(countAfter, countBefore, 'Lead count should NOT increase when merging duplicate phone');
  });

  // 5. Duplicate Check: Hyphenated Phone Format
  await testAsync('5. Duplicate Check: Merges lead when phone has hyphens and spaces', async () => {
    // Kavita Joshi's phone is '+91 97112 33445'
    const mergeKavita = await leadService.createOrMergeLead({
      name: 'Kavita Joshi',
      phone: '97112-33445', // hyphenated
      source: 'Walk-in Visit',
      status: 'Negotiation',
      budget: '₹95 Lakhs',
    });

    assert.strictEqual(mergeKavita.merged, true, 'Should detect duplicate for Kavita');
    assert.strictEqual(mergeKavita.lead.status, 'Negotiation', 'Status should be updated to Negotiation');
    assert.strictEqual(mergeKavita.lead.budget, '₹95 Lakhs');
  });

  // 6. Lead CRUD: Create New Lead (Unique Phone)
  let createdLeadId = null;
  await testAsync('6. Leads CRUD: Create unique new lead', async () => {
    const result = await leadService.createOrMergeLead({
      name: 'Aarav Mehta',
      phone: '+91 98199 88776',
      source: 'Google Ads',
      preferred_bhk: '3 BHK',
      budget: '₹1.40 Cr',
      status: 'New',
      project_id: 'Project 1',
    });

    assert.strictEqual(result.merged, false, 'Should be a new lead, not merged');
    assert(result.lead.id, 'Lead should have an ID');
    assert.strictEqual(result.lead.name, 'Aarav Mehta');
    createdLeadId = result.lead.id;
  });

  // 7. Lead CRUD: Read by ID
  await testAsync('7. Leads CRUD: Read lead by ID', async () => {
    const lead = await leadService.getLeadById(createdLeadId);
    assert(lead, 'Lead must be found');
    assert.strictEqual(lead.name, 'Aarav Mehta');
  });

  // 8. Lead CRUD: Update Lead
  await testAsync('8. Leads CRUD: Update lead status and budget', async () => {
    const updated = await leadService.updateLead(createdLeadId, {
      status: 'Site Visit Scheduled',
      budget: '₹1.45 Cr',
    });
    assert.strictEqual(updated.status, 'Site Visit Scheduled');
    assert.strictEqual(updated.budget, '₹1.45 Cr');
  });

  // 9. Lead CRUD: Delete Lead
  await testAsync('9. Leads CRUD: Delete created lead', async () => {
    const deleted = await leadService.deleteLead(createdLeadId);
    assert.strictEqual(deleted, true);
    const lookup = await leadService.getLeadById(createdLeadId);
    assert.strictEqual(lookup, null, 'Deleted lead should not be found');
  });

  // 10. FactSheet CRUD: Create, Update, Delete
  await testAsync('10. FactSheet CRUD: Full lifecycle', async () => {
    // Create
    const created = await factSheetService.createFactSheet({
      project_id: 'Project 3',
      rera_number: 'PRM/KA/RERA/1251/315/PR/220301/005500',
      details: 'Keshav Green Terraces - Sustainable living with solar energy and terrace gardens.',
      pricing: 'Starting from ₹95 Lakhs',
    });
    assert.strictEqual(created.project_id, 'Project 3');

    // Update
    const updated = await factSheetService.updateFactSheet('Project 3', {
      pricing: 'Starting from ₹98 Lakhs',
    });
    assert.strictEqual(updated.pricing, 'Starting from ₹98 Lakhs');

    // Delete
    const deleted = await factSheetService.deleteFactSheet('Project 3');
    assert.strictEqual(deleted, true);
    const lookup = await factSheetService.getFactSheetById('Project 3');
    assert.strictEqual(lookup, null);
  });

  // 11. VisitSlots: Lock Slot functionality
  await testAsync('11. VisitSlots: Lock slot for booking flow', async () => {
    const locked = await slotsService.lockSlot(2, 20);
    assert(locked.locked_until, 'Slot should have locked_until timestamp');
    const lockTime = new Date(locked.locked_until).getTime();
    assert(lockTime > Date.now(), 'Lock time must be in future');

    // Release lock for subsequent test runs
    await slotsService.updateSlot(2, { locked_until: null });
  });

  console.log('\n====================================================');
  console.log(`🏁 Test Summary: ${passedCount}/${testCount} tests passed successfully.`);
  console.log('====================================================\n');

  if (passedCount === testCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();

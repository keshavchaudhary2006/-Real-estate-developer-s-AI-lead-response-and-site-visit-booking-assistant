const assert = require('assert');
const slotsService = require('../server/services/slotsService');
const reminderCron = require('../server/jobs/reminderCron');
const leadService = require('../server/services/leadService');
const db = require('../db');

async function testSchedulingAndCron() {
  console.log('====================================================');
  console.log('🗓️ Testing Site-Visit Scheduling & Reminder Cron');
  console.log('   - Available Slots Filtering from VisitSlots');
  console.log('   - 2-Minute Temporary Lock (Double-Booking Prevention)');
  console.log('   - Booking Confirmation');
  console.log('   - Background Mock Cron: 24h & 2h Visit Reminders');
  console.log('====================================================\n');

  await db.initDb();
  await db.seedDb();

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  // 1. Available Slots Filtering
  await test('1. Calendar UI: getAvailableSlots returns only unbooked and unlocked slots', async () => {
    const available = await slotsService.getAvailableSlots();
    // Slot #1 was booked in seed data (Hardik Patel) -> must NOT appear
    const slot1 = available.find((s) => s.id === 1);
    assert.strictEqual(slot1, undefined, 'Booked Slot #1 must NOT be in available slots');

    // Slot #2, #3, #4 are unbooked -> must appear
    assert(available.some((s) => s.id === 2), 'Slot #2 must be available');
    assert(available.some((s) => s.id === 3), 'Slot #3 must be available');
  });

  // 2. Critical Constraint: 2-Minute Lock Application
  let lockedSlot = null;
  await test('2. Critical Constraint: Applying 2-minute lock updates locked_until in DB', async () => {
    const lockResult = await slotsService.lockSlot(2, 2); // 2 minutes
    assert.strictEqual(lockResult.success, true);
    assert(lockResult.locked_until, 'Must return locked_until timestamp');

    const lockDate = new Date(lockResult.locked_until);
    const now = new Date();
    const diffSeconds = (lockDate.getTime() - now.getTime()) / 1000;

    // Must be locked for ~120 seconds (2 minutes)
    assert(diffSeconds > 100 && diffSeconds <= 125, `Expected ~120s lock, got ${diffSeconds}s`);

    // Verify database row has locked_until
    const dbSlot = await slotsService.getSlotById(2);
    assert.strictEqual(dbSlot.locked_until, lockResult.locked_until);
    lockedSlot = dbSlot;
  });

  // 3. Double-Booking Prevention: Second user attempting to lock active slot
  await test('3. Double-Booking Prevention: Concurrent lock attempt is strictly rejected', async () => {
    try {
      await slotsService.lockSlot(2, 2);
      assert.fail('Should have thrown an error for actively locked slot');
    } catch (err) {
      assert(
        err.message.includes('temporarily reserved by another buyer'),
        `Error message must indicate temporary reservation, got: ${err.message}`
      );
    }
  });

  // 4. Locked Slot Excluded from Available Slots
  await test('4. Availability Exclusion: Locked slot is omitted from getAvailableSlots', async () => {
    const available = await slotsService.getAvailableSlots();
    const slot2 = available.find((s) => s.id === 2);
    assert.strictEqual(slot2, undefined, 'Actively locked Slot #2 must NOT appear in available slots');
  });

  // 5. Booking Confirmation: Updates status to booked and clears lock
  await test('5. Booking Confirmation: Confirms booking, updates is_booked to true, clears lock', async () => {
    const confirmRes = await slotsService.confirmBooking(2, {
      name: 'Pooja Sharma',
      phone: '+91 99887 76655',
      preferred_bhk: '3 BHK',
      project_id: 'Project 1',
    });

    assert.strictEqual(confirmRes.success, true);
    assert.strictEqual(confirmRes.slot.is_booked, true, 'is_booked must be updated to true');
    assert.strictEqual(confirmRes.slot.locked_until, null, 'locked_until must be cleared upon confirmation');

    // Verify in database
    const dbSlot = await slotsService.getSlotById(2);
    assert.strictEqual(dbSlot.is_booked, true);
    assert.strictEqual(dbSlot.locked_until, null);

    // Verify lead was linked
    const leads = await leadService.getAllLeads();
    const pooja = leads.find((l) => l.name === 'Pooja Sharma');
    assert(pooja, 'Pooja Sharma lead should be created/updated');
    assert.strictEqual(pooja.status, 'Booked');
  });

  // 6. Lock Expiration: Expired lock allows new reservation
  await test('6. Lock Expiration: Expired lock (>2 min past) allows new locking', async () => {
    // Manually set an expired lock on Slot #3 (e.g. 5 minutes ago)
    const pastTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await slotsService.updateSlot(3, { locked_until: pastTime, is_booked: false });

    // New buyer clicks slot #3 -> should successfully acquire a fresh 2-minute lock!
    const newLock = await slotsService.lockSlot(3, 2);
    assert.strictEqual(newLock.success, true);
    assert(new Date(newLock.locked_until) > new Date(), 'New lock must be in the future');

    // Release lock on #3 for cleanup
    await slotsService.releaseLock(3);
  });

  // 7. Background Mock Cron Job: 24-Hour Reminder
  await test('7. Mock Cron 24H: Dispatches reminder 24 hours before booked timestamp', async () => {
    reminderCron.clearLogs();

    // Create a booked visit slot scheduled for tomorrow: 2026-11-09T14:00:00Z
    const visitDate = new Date('2026-11-09T14:00:00Z');
    const testSlot = await slotsService.createSlot({
      date_time: visitDate.toISOString(),
      is_booked: true,
      project_id: 'Project 1',
    });

    // Simulate current time: 23 hours before visit (2026-11-08T15:00:00Z)
    const simulatedNow = new Date('2026-11-08T15:00:00Z');

    const result = await reminderCron.checkAndDispatchReminders(simulatedNow);
    assert(result.reminders_dispatched >= 1, 'Should dispatch at least 1 reminder');

    const logs = reminderCron.getLogs();
    const rem24 = logs.find((l) => l.slot_id === testSlot.id && l.type === '24H_REMINDER');
    assert(rem24, '24-hour reminder must be logged');
    assert(rem24.message.includes('[MOCK CRON - 24H REMINDER]'), 'Must format with 24H header');
    assert(rem24.rera_number.includes('PRM/KA/RERA'), 'Must include mandatory RERA number');

    // Verify database flag reminder_24h_sent is true
    const updatedSlot = await slotsService.getSlotById(testSlot.id);
    assert.strictEqual(updatedSlot.reminder_24h_sent, true, 'reminder_24h_sent must be set to true');

    // Run again with same timestamp -> must NOT duplicate reminder!
    const rerun = await reminderCron.checkAndDispatchReminders(simulatedNow);
    const duplicateCheck = rerun.dispatched_items.filter((l) => l.slot_id === testSlot.id && l.type === '24H_REMINDER');
    assert.strictEqual(duplicateCheck.length, 0, 'Must NOT re-dispatch already sent 24h reminder');
  });

  // 8. Background Mock Cron Job: 2-Hour Reminder
  await test('8. Mock Cron 2H: Dispatches urgent reminder 2 hours before booked timestamp', async () => {
    // Create a booked visit slot scheduled for 2026-11-09T16:00:00Z
    const visitDate = new Date('2026-11-09T16:00:00Z');
    const testSlot2 = await slotsService.createSlot({
      date_time: visitDate.toISOString(),
      is_booked: true,
      project_id: 'Project 2',
    });

    // Simulate current time: 1.5 hours before visit (2026-11-09T14:30:00Z)
    const simulatedNow2 = new Date('2026-11-09T14:30:00Z');

    const result2 = await reminderCron.checkAndDispatchReminders(simulatedNow2);
    assert(result2.reminders_dispatched >= 1, 'Should dispatch 2h reminder');

    const logs = reminderCron.getLogs();
    const rem2h = logs.find((l) => l.slot_id === testSlot2.id && l.type === '2H_REMINDER');
    assert(rem2h, '2-hour reminder must be logged');
    assert(rem2h.message.includes('[MOCK CRON - 2H REMINDER]'), 'Must format with 2H header');
    assert(rem2h.rera_number.includes('PRM/KA/RERA/1251/308'), 'Must include Project 2 RERA number');

    // Verify database flag reminder_2h_sent is true
    const updatedSlot2 = await slotsService.getSlotById(testSlot2.id);
    assert.strictEqual(updatedSlot2.reminder_2h_sent, true, 'reminder_2h_sent must be set to true');
  });

  console.log('\n====================================================');
  console.log(`🏁 Scheduling & Cron Test Summary: ${passed}/${total} passed successfully.`);
  console.log('====================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testSchedulingAndCron();

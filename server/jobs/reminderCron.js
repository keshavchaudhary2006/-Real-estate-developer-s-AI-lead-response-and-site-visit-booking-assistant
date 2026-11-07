const slotsService = require('../services/slotsService');
const leadService = require('../services/leadService');
const factSheetService = require('../services/factSheetService');
const db = require('../../db');

// In-memory audit log of cron reminder events
const cronReminderLogs = [];
let cronIntervalId = null;

/**
 * Executes a single scan cycle of the reminder cron job.
 * Scans all booked slots from the VisitSlots table and checks for 24h and 2h windows.
 *
 * @param {Date|string|null} mockNow - Optional timestamp to simulate current time (for testing)
 */
async function checkAndDispatchReminders(mockNow = null) {
  const currentTime = mockNow ? new Date(mockNow) : new Date();
  const currentIso = currentTime.toISOString();

  // Fetch all booked slots
  const bookedSlots = await slotsService.getAllSlots({ is_booked: true });
  const allLeads = await leadService.getAllLeads();
  const allFactSheets = await factSheetService.getAllFactSheets();

  const dispatched = [];

  for (const slot of bookedSlots) {
    const slotTime = new Date(slot.date_time);
    const diffMs = slotTime.getTime() - currentTime.getTime();
    const hoursUntilVisit = diffMs / (1000 * 60 * 60);

    // Find linked lead
    const linkedLead = allLeads.find((l) => l.slot_id === slot.id || (l.status === 'Booked' && l.project_id === slot.project_id)) || {
      name: 'Valued Client',
      phone: '+91 98765 43210',
    };

    // Find project facts
    const projectFact = allFactSheets.find((f) => f.project_id === slot.project_id) || {
      project_id: slot.project_id || 'Project 1',
      rera_number: 'PRM/KA/RERA/1251/310/PR/210101/004001',
      details: 'Keshav Residences',
    };

    const formattedVisitTime = `${slotTime.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} at ${slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // 1. 24-HOUR REMINDER (Trigger when visit is within 24 hours, but > 2 hours away, and not yet sent)
    if (hoursUntilVisit <= 24 && hoursUntilVisit > 2 && !slot.reminder_24h_sent) {
      const message =
        `[MOCK CRON - 24H REMINDER] 🔔 Upcoming Visit Notification\n` +
        `• Recipient: ${linkedLead.name} (${linkedLead.phone})\n` +
        `• Project: ${projectFact.project_id} (${projectFact.details.slice(0, 45)}...)\n` +
        `• Time: Tomorrow (${formattedVisitTime})\n` +
        `• Mandatory RERA: ${projectFact.rera_number}\n` +
        `• Statutory Notice: Pursuant to DPDP Act 2023, reply STOP to withdraw consent.`;

      console.log(message);

      const logEntry = {
        id: `rem-24h-${slot.id}-${Date.now()}`,
        type: '24H_REMINDER',
        slot_id: slot.id,
        lead_name: linkedLead.name,
        lead_phone: linkedLead.phone,
        project_id: projectFact.project_id,
        rera_number: projectFact.rera_number,
        visit_time: slot.date_time,
        dispatched_at: currentIso,
        hours_until_visit: hoursUntilVisit.toFixed(1),
        message,
      };

      cronReminderLogs.push(logEntry);
      dispatched.push(logEntry);

      // Update database row
      await slotsService.updateSlot(slot.id, { reminder_24h_sent: true });
    }

    // 2. 2-HOUR REMINDER (Trigger when visit is within 2 hours, and not yet sent)
    if (hoursUntilVisit <= 2 && hoursUntilVisit > 0 && !slot.reminder_2h_sent) {
      const message =
        `[MOCK CRON - 2H REMINDER] ⏰ Urgent 2-Hour Visit Reminder\n` +
        `• Recipient: ${linkedLead.name} (${linkedLead.phone})\n` +
        `• Project: ${projectFact.project_id}\n` +
        `• Time: In ~${Math.round(hoursUntilVisit * 60)} minutes (${formattedVisitTime})\n` +
        `• Dedicated Advisor: Senior Residential Advisory Desk is awaiting your arrival.\n` +
        `• Mandatory RERA: ${projectFact.rera_number}\n` +
        `• Statutory Notice: DPDP Act 2023 compliant. Reply STOP to opt out.`;

      console.log(message);

      const logEntry = {
        id: `rem-2h-${slot.id}-${Date.now()}`,
        type: '2H_REMINDER',
        slot_id: slot.id,
        lead_name: linkedLead.name,
        lead_phone: linkedLead.phone,
        project_id: projectFact.project_id,
        rera_number: projectFact.rera_number,
        visit_time: slot.date_time,
        dispatched_at: currentIso,
        hours_until_visit: hoursUntilVisit.toFixed(1),
        message,
      };

      cronReminderLogs.push(logEntry);
      dispatched.push(logEntry);

      // Update database row
      await slotsService.updateSlot(slot.id, { reminder_2h_sent: true });
    }
  }

  return {
    success: true,
    scan_timestamp: currentIso,
    total_booked_slots_scanned: bookedSlots.length,
    reminders_dispatched: dispatched.length,
    dispatched_items: dispatched,
  };
}

/**
 * Start the background cron interval runner
 */
function startCron(intervalMs = 60000) {
  if (cronIntervalId) return;
  console.log(`[Cron] Starting VisitSlots reminder cron job (interval: ${intervalMs}ms)...`);
  cronIntervalId = setInterval(async () => {
    try {
      await checkAndDispatchReminders();
    } catch (err) {
      console.error('[Cron Error] Failure in reminder cron job:', err);
    }
  }, intervalMs);
}

/**
 * Stop the background cron runner
 */
function stopCron() {
  if (cronIntervalId) {
    clearInterval(cronIntervalId);
    cronIntervalId = null;
    console.log('[Cron] Reminder cron job stopped.');
  }
}

function getLogs() {
  return [...cronReminderLogs];
}

function clearLogs() {
  cronReminderLogs.length = 0;
}

module.exports = {
  checkAndDispatchReminders,
  startCron,
  stopCron,
  getLogs,
  clearLogs,
};

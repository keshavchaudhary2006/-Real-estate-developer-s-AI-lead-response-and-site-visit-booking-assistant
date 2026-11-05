const db = require('../../db');

/**
 * Get all visit slots with optional filtering (project_id, is_booked)
 */
async function getAllSlots(filters = {}) {
  const { project_id, is_booked, only_available } = filters;

  if (db.getMode() === 'postgresql') {
    let sql = 'SELECT * FROM visit_slots WHERE 1=1';
    const params = [];

    if (project_id) {
      params.push(project_id);
      sql += ` AND project_id = $${params.length}`;
    }
    if (is_booked !== undefined) {
      params.push(is_booked === 'true' || is_booked === true);
      sql += ` AND is_booked = $${params.length}`;
    }
    if (only_available) {
      // Must not be booked and must not have an active lock
      sql += ` AND is_booked = false AND (locked_until IS NULL OR locked_until <= CURRENT_TIMESTAMP)`;
    }

    sql += ' ORDER BY date_time ASC';
    const res = await db.query(sql, params);
    return res.rows;
  } else {
    let list = [...db.localStore.getTable('visit_slots')];

    if (project_id) {
      list = list.filter((s) => s.project_id === project_id);
    }
    if (is_booked !== undefined) {
      const boolVal = is_booked === 'true' || is_booked === true;
      list = list.filter((s) => Boolean(s.is_booked) === boolVal);
    }
    if (only_available) {
      const now = new Date();
      list = list.filter((s) => {
        if (s.is_booked) return false;
        if (s.locked_until && new Date(s.locked_until) > now) return false;
        return true;
      });
    }

    list.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
    return list;
  }
}

/**
 * Get only unbooked, unlocked slots for the calendar UI
 */
async function getAvailableSlots(filters = {}) {
  return getAllSlots({ ...filters, only_available: true });
}

/**
 * Get single slot by ID
 */
async function getSlotById(id) {
  const numId = parseInt(id, 10);
  if (db.getMode() === 'postgresql') {
    const res = await db.query('SELECT * FROM visit_slots WHERE id = $1', [numId]);
    return res.rows[0] || null;
  } else {
    const list = db.localStore.getTable('visit_slots');
    return list.find((s) => s.id === numId) || null;
  }
}

/**
 * Create a new visit slot
 */
async function createSlot(data) {
  const { date_time, is_booked = false, locked_until = null, project_id = null } = data;
  if (!date_time) {
    throw new Error('date_time is required.');
  }

  const createdAt = new Date().toISOString();
  const parsedDate = new Date(date_time).toISOString();

  if (db.getMode() === 'postgresql') {
    const sql = `
      INSERT INTO visit_slots (date_time, is_booked, locked_until, project_id, reminder_24h_sent, reminder_2h_sent, created_at)
      VALUES ($1, $2, $3, $4, false, false, $5)
      RETURNING *
    `;
    const res = await db.query(sql, [parsedDate, Boolean(is_booked), locked_until, project_id, createdAt]);
    return res.rows[0];
  } else {
    const list = db.localStore.getTable('visit_slots');
    const newId = list.reduce((max, s) => Math.max(max, s.id || 0), 0) + 1;
    const newSlot = {
      id: newId,
      date_time: parsedDate,
      is_booked: Boolean(is_booked),
      locked_until: locked_until || null,
      project_id: project_id || null,
      reminder_24h_sent: false,
      reminder_2h_sent: false,
      created_at: createdAt,
    };
    list.push(newSlot);
    db.localStore.writeData(db.localStore.data);
    return newSlot;
  }
}

/**
 * Update slot
 */
async function updateSlot(id, data) {
  const numId = parseInt(id, 10);
  const existing = await getSlotById(numId);
  if (!existing) return null;

  const date_time = data.date_time ? new Date(data.date_time).toISOString() : existing.date_time;
  const is_booked = data.is_booked !== undefined ? Boolean(data.is_booked) : existing.is_booked;
  const locked_until = data.locked_until !== undefined ? data.locked_until : existing.locked_until;
  const project_id = data.project_id !== undefined ? data.project_id : existing.project_id;
  const reminder_24h_sent = data.reminder_24h_sent !== undefined ? Boolean(data.reminder_24h_sent) : (existing.reminder_24h_sent || false);
  const reminder_2h_sent = data.reminder_2h_sent !== undefined ? Boolean(data.reminder_2h_sent) : (existing.reminder_2h_sent || false);

  if (db.getMode() === 'postgresql') {
    const sql = `
      UPDATE visit_slots
      SET date_time = $1, is_booked = $2, locked_until = $3, project_id = $4,
          reminder_24h_sent = $5, reminder_2h_sent = $6
      WHERE id = $7
      RETURNING *
    `;
    const res = await db.query(sql, [date_time, is_booked, locked_until, project_id, reminder_24h_sent, reminder_2h_sent, numId]);
    return res.rows[0];
  } else {
    const list = db.localStore.getTable('visit_slots');
    const idx = list.findIndex((s) => s.id === numId);
    const updated = {
      ...existing,
      date_time,
      is_booked,
      locked_until,
      project_id,
      reminder_24h_sent,
      reminder_2h_sent,
    };
    list[idx] = updated;
    db.localStore.writeData(db.localStore.data);
    return updated;
  }
}

/**
 * CRITICAL CONSTRAINT:
 * Apply a 2-minute temporary lock on a slot row in the database to prevent double-booking.
 * If locked_until is actively in the future, reject other users.
 */
async function lockSlot(id, durationMinutes = 2) {
  const numId = parseInt(id, 10);
  const slot = await getSlotById(numId);
  if (!slot) {
    throw new Error(`Slot #${numId} not found.`);
  }
  if (slot.is_booked) {
    throw new Error('This slot is already booked and unavailable.');
  }

  const now = new Date();
  // Check if actively locked by another user/session
  if (slot.locked_until && new Date(slot.locked_until) > now) {
    const remainingSeconds = Math.ceil((new Date(slot.locked_until).getTime() - now.getTime()) / 1000);
    throw new Error(
      `Slot #${numId} is temporarily reserved by another buyer (${remainingSeconds}s remaining). Please choose another slot or try again shortly.`
    );
  }

  // Apply exactly durationMinutes lock (defaults to 2 minutes)
  const lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  const updatedSlot = await updateSlot(numId, { locked_until: lockedUntil });

  console.log(`[Slot Lock] Slot #${numId} locked until ${lockedUntil} (${durationMinutes} mins)`);
  return {
    success: true,
    message: `Slot #${numId} reserved for ${durationMinutes} minutes. Please confirm to finalize booking.`,
    slot: updatedSlot,
    locked_until: lockedUntil,
    expiresInSeconds: durationMinutes * 60,
  };
}

/**
 * Release an active lock on a slot
 */
async function releaseLock(id) {
  const numId = parseInt(id, 10);
  const slot = await getSlotById(numId);
  if (!slot) return null;

  if (slot.is_booked) {
    return slot; // Don't unlock a confirmed booking
  }

  console.log(`[Slot Lock] Releasing lock on Slot #${numId}`);
  return updateSlot(numId, { locked_until: null });
}

/**
 * Confirm a booking on a locked slot
 * Updates status to booked and links lead.
 */
async function confirmBooking(id, buyerData = {}) {
  const numId = parseInt(id, 10);
  const slot = await getSlotById(numId);
  if (!slot) {
    throw new Error(`Slot #${numId} not found.`);
  }
  if (slot.is_booked) {
    throw new Error(`Slot #${numId} is already booked.`);
  }

  // Check if the 2-minute lock expired
  const now = new Date();
  if (slot.locked_until && new Date(slot.locked_until) < now) {
    throw new Error('Your 2-minute temporary reservation has expired. Please select the slot again.');
  }

  // Update slot to booked, clear lock
  const updatedSlot = await updateSlot(numId, {
    is_booked: true,
    locked_until: null,
    reminder_24h_sent: false,
    reminder_2h_sent: false,
  });

  // If buyer details provided, create or merge lead
  let lead = null;
  if (buyerData.phone) {
    const leadService = require('./leadService');
    const leadRes = await leadService.createOrMergeLead({
      name: buyerData.name || 'Valued Buyer',
      phone: buyerData.phone,
      source: buyerData.source || 'Site Visit Booking Calendar',
      preferred_bhk: buyerData.preferred_bhk || '3 BHK',
      budget: buyerData.budget || null,
      status: 'Booked',
      project_id: updatedSlot.project_id || buyerData.project_id || 'Project 1',
      slot_id: numId,
    });
    lead = leadRes.lead;
  }

  console.log(`[Slot Booking] Slot #${numId} confirmed booked! Buyer: ${buyerData.name || 'N/A'}`);

  return {
    success: true,
    message: 'Site visit successfully booked and confirmed!',
    slot: updatedSlot,
    lead,
  };
}

/**
 * Delete a slot
 */
async function deleteSlot(id) {
  const numId = parseInt(id, 10);
  const existing = await getSlotById(numId);
  if (!existing) return false;

  if (db.getMode() === 'postgresql') {
    await db.query('DELETE FROM visit_slots WHERE id = $1', [numId]);
    return true;
  } else {
    const list = db.localStore.getTable('visit_slots');
    const idx = list.findIndex((s) => s.id === numId);
    if (idx !== -1) {
      list.splice(idx, 1);
      db.localStore.writeData(db.localStore.data);
      return true;
    }
    return false;
  }
}

module.exports = {
  getAllSlots,
  getAvailableSlots,
  getSlotById,
  createSlot,
  updateSlot,
  lockSlot,
  releaseLock,
  confirmBooking,
  deleteSlot,
};

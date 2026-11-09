const db = require('../../db');

/**
 * Normalizes phone numbers to a canonical digit format.
 * E.g., '+91 98765 43210' -> '9876543210'
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  // If Indian 12-digit number with country code 91, extract last 10 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  // If starting with leading 0 (11 digits), strip 0
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Search for an existing lead with matching phone number
 */
async function findLeadByPhone(phone, excludeId = null) {
  const norm = normalizePhone(phone);
  if (!norm) return null;

  if (db.getMode() === 'postgresql') {
    let sql = `
      SELECT * FROM leads 
      WHERE REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE $1 
         OR phone = $2
    `;
    const params = [`%${norm}`, phone];
    if (excludeId) {
      sql += ` AND id != $3`;
      params.push(excludeId);
    }
    sql += ` LIMIT 1`;
    const res = await db.query(sql, params);
    return res.rows[0] || null;
  } else {
    const list = db.localStore.getTable('leads');
    return (
      list.find((l) => {
        if (excludeId && l.id === excludeId) return false;
        return normalizePhone(l.phone) === norm || l.phone === phone;
      }) || null
    );
  }
}

/**
 * Get all leads with optional filtering and search
 */
async function getAllLeads(filters = {}) {
  const { status, preferred_bhk, search } = filters;

  if (db.getMode() === 'postgresql') {
    let sql = 'SELECT * FROM leads WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (preferred_bhk) {
      params.push(preferred_bhk);
      sql += ` AND preferred_bhk = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR source ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC';
    const res = await db.query(sql, params);
    return res.rows;
  } else {
    let list = [...db.localStore.getTable('leads')];

    if (status) {
      list = list.filter((l) => l.status && l.status.toLowerCase() === status.toLowerCase());
    }
    if (preferred_bhk) {
      list = list.filter((l) => l.preferred_bhk && l.preferred_bhk.toLowerCase() === preferred_bhk.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          (l.name && l.name.toLowerCase().includes(q)) ||
          (l.phone && l.phone.toLowerCase().includes(q)) ||
          (l.source && l.source.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }
}

/**
 * Get single lead by ID
 */
async function getLeadById(id) {
  const numId = parseInt(id, 10);
  if (db.getMode() === 'postgresql') {
    const res = await db.query('SELECT * FROM leads WHERE id = $1', [numId]);
    return res.rows[0] || null;
  } else {
    const list = db.localStore.getTable('leads');
    return list.find((l) => l.id === numId) || null;
  }
}

/**
 * Create a new lead or merge with existing lead if phone matches
 * Core duplicate check logic
 */
async function createOrMergeLead(data) {
  const { name, phone, source, preferred_bhk, budget, status, project_id, slot_id } = data;

  if (!phone || !phone.trim()) {
    throw new Error('Phone number is required.');
  }
  if (!name || !name.trim()) {
    throw new Error('Name is required.');
  }

  // Check for duplicate phone
  const existing = await findLeadByPhone(phone);

  if (existing) {
    // DUPLICATE DETECTED: Merge logic
    console.log(`[Duplicate Check] Lead with phone "${phone}" exists (ID: ${existing.id}). Merging details.`);

    const mergedName = name && name.trim() ? name.trim() : existing.name;
    const mergedSource = source && source.trim() ? source.trim() : existing.source;
    const mergedBhk = preferred_bhk && preferred_bhk.trim() ? preferred_bhk.trim() : existing.preferred_bhk;
    const mergedBudget = budget && budget.trim() ? budget.trim() : existing.budget;
    const mergedStatus = status && status.trim() ? status.trim() : existing.status;
    const mergedProjectId = project_id !== undefined ? project_id : existing.project_id;
    const mergedSlotId = slot_id !== undefined ? slot_id : existing.slot_id;
    const updatedAt = new Date().toISOString();

    if (db.getMode() === 'postgresql') {
      const sql = `
        UPDATE leads 
        SET name = $1, source = $2, preferred_bhk = $3, budget = $4, status = $5,
            project_id = $6, slot_id = $7, updated_at = $8
        WHERE id = $9
        RETURNING *
      `;
      const res = await db.query(sql, [
        mergedName,
        mergedSource,
        mergedBhk,
        mergedBudget,
        mergedStatus,
        mergedProjectId,
        mergedSlotId,
        updatedAt,
        existing.id,
      ]);
      return {
        merged: true,
        message: `Existing lead found with phone '${phone}' (ID: ${existing.id}). Details merged successfully.`,
        lead: res.rows[0],
        previousData: existing,
      };
    } else {
      const list = db.localStore.getTable('leads');
      const idx = list.findIndex((l) => l.id === existing.id);
      const updated = {
        ...existing,
        name: mergedName,
        source: mergedSource,
        preferred_bhk: mergedBhk,
        budget: mergedBudget,
        status: mergedStatus,
        project_id: mergedProjectId,
        slot_id: mergedSlotId,
        updated_at: updatedAt,
      };
      list[idx] = updated;
      db.localStore.writeData(db.localStore.data);
      return {
        merged: true,
        message: `Existing lead found with phone '${phone}' (ID: ${existing.id}). Details merged successfully.`,
        lead: updated,
        previousData: existing,
      };
    }
  }

  // NO DUPLICATE: Insert new lead
  const createdAt = new Date().toISOString();
  const leadStatus = status && status.trim() ? status.trim() : 'New';

  if (db.getMode() === 'postgresql') {
    const sql = `
      INSERT INTO leads (name, phone, source, preferred_bhk, budget, status, created_at, project_id, slot_id, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const res = await db.query(sql, [
      name.trim(),
      phone.trim(),
      source || null,
      preferred_bhk || null,
      budget || null,
      leadStatus,
      createdAt,
      project_id || null,
      slot_id || null,
      createdAt,
    ]);
    return {
      merged: false,
      message: 'Lead created successfully.',
      lead: res.rows[0],
    };
  } else {
    const list = db.localStore.getTable('leads');
    const newId = list.reduce((max, l) => Math.max(max, l.id || 0), 0) + 1;
    const newLead = {
      id: newId,
      name: name.trim(),
      phone: phone.trim(),
      source: source || null,
      preferred_bhk: preferred_bhk || null,
      budget: budget || null,
      status: leadStatus,
      created_at: createdAt,
      project_id: project_id || null,
      slot_id: slot_id || null,
      updated_at: createdAt,
    };
    list.push(newLead);
    db.localStore.writeData(db.localStore.data);
    return {
      merged: false,
      message: 'Lead created successfully.',
      lead: newLead,
    };
  }
}

/**
 * Update an existing lead by ID (with optional duplicate phone prevention against other leads)
 */
async function updateLead(id, data) {
  const numId = parseInt(id, 10);
  const existing = await getLeadById(numId);
  if (!existing) {
    return null;
  }

  // If phone is being changed, check if another lead already has this phone
  if (data.phone && normalizePhone(data.phone) !== normalizePhone(existing.phone)) {
    const duplicate = await findLeadByPhone(data.phone, numId);
    if (duplicate) {
      throw new Error(`Cannot update phone: Another lead (ID: ${duplicate.id}, Name: ${duplicate.name}) already has this phone number.`);
    }
  }

  const name = data.name !== undefined ? data.name : existing.name;
  const phone = data.phone !== undefined ? data.phone : existing.phone;
  const source = data.source !== undefined ? data.source : existing.source;
  const preferred_bhk = data.preferred_bhk !== undefined ? data.preferred_bhk : existing.preferred_bhk;
  const budget = data.budget !== undefined ? data.budget : existing.budget;
  const status = data.status !== undefined ? data.status : existing.status;
  const project_id = data.project_id !== undefined ? data.project_id : existing.project_id;
  const slot_id = data.slot_id !== undefined ? data.slot_id : existing.slot_id;
  const updatedAt = new Date().toISOString();

  if (db.getMode() === 'postgresql') {
    const sql = `
      UPDATE leads
      SET name = $1, phone = $2, source = $3, preferred_bhk = $4, budget = $5,
          status = $6, project_id = $7, slot_id = $8, updated_at = $9
      WHERE id = $10
      RETURNING *
    `;
    const res = await db.query(sql, [name, phone, source, preferred_bhk, budget, status, project_id, slot_id, updatedAt, numId]);
    return res.rows[0];
  } else {
    const list = db.localStore.getTable('leads');
    const idx = list.findIndex((l) => l.id === numId);
    const updated = {
      ...existing,
      name,
      phone,
      source,
      preferred_bhk,
      budget,
      status,
      project_id,
      slot_id,
      updated_at: updatedAt,
    };
    list[idx] = updated;
    db.localStore.writeData(db.localStore.data);
    return updated;
  }
}

/**
 * Delete a lead by ID
 */
async function deleteLead(id) {
  const numId = parseInt(id, 10);
  const existing = await getLeadById(numId);
  if (!existing) {
    return false;
  }

  if (db.getMode() === 'postgresql') {
    await db.query('DELETE FROM leads WHERE id = $1', [numId]);
    return true;
  } else {
    const list = db.localStore.getTable('leads');
    const idx = list.findIndex((l) => l.id === numId);
    if (idx !== -1) {
      list.splice(idx, 1);
      db.localStore.writeData(db.localStore.data);
      return true;
    }
    return false;
  }
}

/**
 * Explicit manual merge of two leads: merges sourceLead into targetLead and deletes sourceLead
 */
async function mergeLeads(targetId, sourceId) {
  const tId = parseInt(targetId, 10);
  const sId = parseInt(sourceId, 10);
  if (tId === sId) {
    throw new Error('Target lead and source lead cannot be the same.');
  }

  const target = await getLeadById(tId);
  const source = await getLeadById(sId);

  if (!target || !source) {
    throw new Error('One or both leads not found for merging.');
  }

  const mergedData = {
    name: target.name || source.name,
    phone: target.phone || source.phone,
    source: target.source || source.source,
    preferred_bhk: target.preferred_bhk || source.preferred_bhk,
    budget: target.budget || source.budget,
    status: target.status === 'Booked' ? 'Booked' : (source.status === 'Booked' ? 'Booked' : (target.status || source.status)),
    project_id: target.project_id || source.project_id,
    slot_id: target.slot_id || source.slot_id,
  };

  const updatedTarget = await updateLead(tId, mergedData);
  await deleteLead(sId);

  return {
    merged: true,
    primaryLead: updatedTarget,
    deletedLeadId: sId,
    message: `Lead #${sId} successfully merged into Lead #${tId}.`,
  };
}

module.exports = {
  normalizePhone,
  findLeadByPhone,
  getAllLeads,
  getLeadById,
  createOrMergeLead,
  updateLead,
  deleteLead,
  mergeLeads,
};

const db = require('../../db');

/**
 * Get all project fact sheets
 */
async function getAllFactSheets() {
  if (db.getMode() === 'postgresql') {
    const res = await db.query('SELECT * FROM fact_sheet ORDER BY project_id ASC');
    return res.rows;
  } else {
    return [...db.localStore.getTable('fact_sheet')];
  }
}

/**
 * Get fact sheet by project_id
 */
async function getFactSheetById(projectId) {
  if (db.getMode() === 'postgresql') {
    const res = await db.query('SELECT * FROM fact_sheet WHERE project_id = $1', [projectId]);
    return res.rows[0] || null;
  } else {
    const list = db.localStore.getTable('fact_sheet');
    return list.find((f) => f.project_id === projectId) || null;
  }
}

/**
 * Create a new fact sheet
 */
async function createFactSheet(data) {
  const { project_id, rera_number, details, pricing } = data;
  if (!project_id || !project_id.trim()) throw new Error('project_id is required.');
  if (!rera_number || !rera_number.trim()) throw new Error('rera_number is required.');
  if (!details || !details.trim()) throw new Error('details is required.');
  if (!pricing || !pricing.trim()) throw new Error('pricing is required.');

  const existing = await getFactSheetById(project_id.trim());
  if (existing) {
    throw new Error(`FactSheet for project "${project_id}" already exists.`);
  }

  const now = new Date().toISOString();

  if (db.getMode() === 'postgresql') {
    const sql = `
      INSERT INTO fact_sheet (project_id, rera_number, details, pricing, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await db.query(sql, [project_id.trim(), rera_number.trim(), details.trim(), pricing.trim(), now, now]);
    return res.rows[0];
  } else {
    const list = db.localStore.getTable('fact_sheet');
    const newFs = {
      project_id: project_id.trim(),
      rera_number: rera_number.trim(),
      details: details.trim(),
      pricing: pricing.trim(),
      created_at: now,
      updated_at: now,
    };
    list.push(newFs);
    db.localStore.writeData(db.localStore.data);
    return newFs;
  }
}

/**
 * Update fact sheet by project_id
 */
async function updateFactSheet(projectId, data) {
  const existing = await getFactSheetById(projectId);
  if (!existing) return null;

  const rera_number = data.rera_number !== undefined ? data.rera_number : existing.rera_number;
  const details = data.details !== undefined ? data.details : existing.details;
  const pricing = data.pricing !== undefined ? data.pricing : existing.pricing;
  const now = new Date().toISOString();

  if (db.getMode() === 'postgresql') {
    const sql = `
      UPDATE fact_sheet
      SET rera_number = $1, details = $2, pricing = $3, updated_at = $4
      WHERE project_id = $5
      RETURNING *
    `;
    const res = await db.query(sql, [rera_number, details, pricing, now, projectId]);
    return res.rows[0];
  } else {
    const list = db.localStore.getTable('fact_sheet');
    const idx = list.findIndex((f) => f.project_id === projectId);
    const updated = {
      ...existing,
      rera_number,
      details,
      pricing,
      updated_at: now,
    };
    list[idx] = updated;
    db.localStore.writeData(db.localStore.data);
    return updated;
  }
}

/**
 * Delete fact sheet by project_id
 */
async function deleteFactSheet(projectId) {
  const existing = await getFactSheetById(projectId);
  if (!existing) return false;

  if (db.getMode() === 'postgresql') {
    await db.query('DELETE FROM fact_sheet WHERE project_id = $1', [projectId]);
    return true;
  } else {
    const list = db.localStore.getTable('fact_sheet');
    const idx = list.findIndex((f) => f.project_id === projectId);
    if (idx !== -1) {
      list.splice(idx, 1);
      db.localStore.writeData(db.localStore.data);
      return true;
    }
    return false;
  }
}

module.exports = {
  getAllFactSheets,
  getFactSheetById,
  createFactSheet,
  updateFactSheet,
  deleteFactSheet,
};

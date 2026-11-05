const factSheetService = require('../services/factSheetService');

/**
 * GET /api/factsheet
 */
async function getAllFactSheets(req, res) {
  try {
    const list = await factSheetService.getAllFactSheets();
    res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    console.error('Error fetching fact sheets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/factsheet/:id
 */
async function getFactSheetById(req, res) {
  try {
    const item = await factSheetService.getFactSheetById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'FactSheet not found.' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching fact sheet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/factsheet
 */
async function createFactSheet(req, res) {
  try {
    const item = await factSheetService.createFactSheet(req.body);
    res.status(201).json({
      success: true,
      message: 'FactSheet created successfully.',
      data: item,
    });
  } catch (error) {
    console.error('Error creating fact sheet:', error);
    res.status(400).json({ success: false, error: error.message });
  }
}

/**
 * PUT or PATCH /api/factsheet/:id
 */
async function updateFactSheet(req, res) {
  try {
    const updated = await factSheetService.updateFactSheet(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'FactSheet not found.' });
    }
    res.json({
      success: true,
      message: 'FactSheet updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating fact sheet:', error);
    res.status(400).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/factsheet/:id
 */
async function deleteFactSheet(req, res) {
  try {
    const success = await factSheetService.deleteFactSheet(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'FactSheet not found.' });
    }
    res.json({
      success: true,
      message: `FactSheet for project "${req.params.id}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting fact sheet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getAllFactSheets,
  getFactSheetById,
  createFactSheet,
  updateFactSheet,
  deleteFactSheet,
};

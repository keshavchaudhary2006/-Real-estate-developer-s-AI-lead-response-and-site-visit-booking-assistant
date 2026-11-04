const leadService = require('../services/leadService');

/**
 * GET /api/leads
 * Query params: status, preferred_bhk, search
 */
async function getAllLeads(req, res) {
  try {
    const filters = {
      status: req.query.status,
      preferred_bhk: req.query.preferred_bhk,
      search: req.query.search,
    };
    const leads = await leadService.getAllLeads(filters);
    res.json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/leads/:id
 */
async function getLeadById(req, res) {
  try {
    const lead = await leadService.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found.' });
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    console.error('Error fetching lead by ID:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/leads
 * Body: { name, phone, source, preferred_bhk, budget, status, project_id, slot_id }
 * Performs Duplicate Check:
 * - If phone matches existing lead, merges details into existing record
 * - If phone is new, inserts a new lead
 */
async function createOrMergeLead(req, res) {
  try {
    const result = await leadService.createOrMergeLead(req.body);
    const statusCode = result.merged ? 200 : 201;
    res.status(statusCode).json({
      success: true,
      merged: result.merged,
      message: result.message,
      data: result.lead,
      previousData: result.previousData,
    });
  } catch (error) {
    console.error('Error in create/merge lead:', error);
    res.status(400).json({ success: false, error: error.message });
  }
}

/**
 * PUT or PATCH /api/leads/:id
 */
async function updateLead(req, res) {
  try {
    const updated = await leadService.updateLead(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Lead not found.' });
    }
    res.json({
      success: true,
      message: 'Lead updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(400).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/leads/:id
 */
async function deleteLead(req, res) {
  try {
    const success = await leadService.deleteLead(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Lead not found.' });
    }
    res.json({
      success: true,
      message: `Lead #${req.params.id} deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/leads/merge
 * Body: { primaryLeadId, duplicateLeadId }
 */
async function mergeLeads(req, res) {
  try {
    const { primaryLeadId, duplicateLeadId } = req.body;
    if (!primaryLeadId || !duplicateLeadId) {
      return res.status(400).json({
        success: false,
        error: 'Both primaryLeadId and duplicateLeadId are required.',
      });
    }
    const result = await leadService.mergeLeads(primaryLeadId, duplicateLeadId);
    res.json({
      success: true,
      message: result.message,
      data: result.primaryLead,
      deletedLeadId: result.deletedLeadId,
    });
  } catch (error) {
    console.error('Error merging leads:', error);
    res.status(400).json({ success: false, error: error.message });
  }
}

module.exports = {
  getAllLeads,
  getLeadById,
  createOrMergeLead,
  updateLead,
  deleteLead,
  mergeLeads,
};

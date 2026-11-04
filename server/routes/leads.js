const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leadsController');

// CRUD endpoints for Leads with duplicate phone merge
router.get('/', leadsController.getAllLeads);
router.post('/', leadsController.createOrMergeLead);
router.post('/merge', leadsController.mergeLeads);
router.get('/:id', leadsController.getLeadById);
router.put('/:id', leadsController.updateLead);
router.patch('/:id', leadsController.updateLead);
router.delete('/:id', leadsController.deleteLead);

module.exports = router;

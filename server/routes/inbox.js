const express = require('express');
const router = express.Router();
const inboxController = require('../controllers/inboxController');

// Unified Lead Inbox endpoints
router.get('/leads', inboxController.getInboxLeads);
router.get('/leads/:id/transcript', inboxController.getLeadTranscript);
router.post('/leads/:id/takeover', inboxController.handleTakeover);
router.post('/leads/:id/message', inboxController.sendExecutiveMessage);

module.exports = router;

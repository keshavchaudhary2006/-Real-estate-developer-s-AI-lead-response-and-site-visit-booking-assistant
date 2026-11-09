const inboxService = require('../services/inboxService');

/**
 * Controller for Sales Executive Unified Lead Inbox
 */

async function getInboxLeads(req, res) {
  try {
    const leads = await inboxService.getInboxLeads();
    res.json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error('Error fetching inbox leads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getLeadTranscript(req, res) {
  try {
    const leadId = req.params.id;
    const transcript = await inboxService.getLeadTranscript(leadId);
    res.json({
      success: true,
      lead_id: parseInt(leadId, 10),
      count: transcript.length,
      data: transcript,
    });
  } catch (error) {
    console.error(`Error fetching transcript for lead #${req.params.id}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function handleTakeover(req, res) {
  try {
    const leadId = req.params.id;
    const { action, executiveName } = req.body || {};

    let result;
    if (action === 'release') {
      result = await inboxService.releaseChat(leadId);
    } else {
      result = await inboxService.takeOverChat(leadId, executiveName || 'Sales Executive');
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(`Error toggling takeover for lead #${req.params.id}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function sendExecutiveMessage(req, res) {
  try {
    const leadId = req.params.id;
    const { text, executiveName } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Message text is required.' });
    }

    const message = await inboxService.sendExecutiveMessage(leadId, {
      text,
      executiveName: executiveName || 'Sales Executive',
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error(`Error sending executive message for lead #${req.params.id}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getInboxLeads,
  getLeadTranscript,
  handleTakeover,
  sendExecutiveMessage,
};

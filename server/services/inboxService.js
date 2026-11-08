const db = require('../../db');
const leadService = require('./leadService');
const factSheetService = require('./factSheetService');
const slotsService = require('./slotsService');

// In-memory takeover state tracking: { [leadId]: { isTakenOver: boolean, executiveName: string, takenOverAt: string } }
const takeoverState = {};

/**
 * Normalizes lead source to standardized tags: Portal, Ads, Hoarding, or Direct
 */
function getSourceTag(source) {
  if (!source) return 'Direct';
  const s = source.toLowerCase();
  if (s.includes('portal') || s.includes('magicbricks') || s.includes('99acres')) return 'Portal';
  if (s.includes('ad') || s.includes('social') || s.includes('instagram') || s.includes('facebook') || s.includes('google')) return 'Ads';
  if (s.includes('hoarding') || s.includes('billboard') || s.includes('banner')) return 'Hoarding';
  return 'Direct';
}

/**
 * Categorizes status into Hot, Visited, or Cold for subtle accent color tag rendering
 */
function getStatusCategory(status) {
  if (!status) return 'Cold';
  const s = status.toLowerCase();
  if (s === 'booked' || s.includes('hot') || s.includes('negotiat') || s.includes('ready')) return 'Hot';
  if (s === 'visited' || s.includes('visit') || s.includes('scheduled')) return 'Visited';
  return 'Cold';
}

/**
 * Get all leads for the Executive Inbox with source tags, status category, and latest message snippet
 */
async function getInboxLeads() {
  const leads = await leadService.getAllLeads();
  const factSheets = await factSheetService.getAllFactSheets();
  const allSlots = await slotsService.getAllSlots();

  const inboxLeads = await Promise.all(
    leads.map(async (lead) => {
      const transcript = await getLeadTranscript(lead.id);
      const latestMsg = transcript.length > 0 ? transcript[transcript.length - 1] : null;

      const project = factSheets.find((f) => f.project_id === lead.project_id) || null;
      const slot = lead.slot_id ? allSlots.find((s) => s.id === lead.slot_id) : null;
      const takeoverInfo = takeoverState[lead.id] || { isTakenOver: false, executiveName: null };

      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        source_tag: getSourceTag(lead.source), // 'Portal' | 'Ads' | 'Hoarding' | 'Direct'
        preferred_bhk: lead.preferred_bhk || 'Flexible',
        budget: lead.budget || 'Unspecified',
        status: lead.status || 'New',
        status_category: getStatusCategory(lead.status), // 'Hot' | 'Visited' | 'Cold'
        created_at: lead.created_at,
        updated_at: lead.updated_at || lead.created_at,
        project_id: lead.project_id,
        project_pricing: project ? project.pricing : null,
        project_rera: project ? project.rera_number : null,
        slot_id: lead.slot_id,
        slot_date_time: slot ? slot.date_time : null,
        is_taken_over: takeoverInfo.isTakenOver,
        executive_name: takeoverInfo.executiveName,
        latest_message: latestMsg
          ? {
              text: latestMsg.text.slice(0, 75) + (latestMsg.text.length > 75 ? '...' : ''),
              sender: latestMsg.sender,
              created_at: latestMsg.created_at,
            }
          : null,
      };
    })
  );

  return inboxLeads;
}

/**
 * Fetch full chronological AI chat transcript for a specific lead
 */
async function getLeadTranscript(leadId) {
  const numId = parseInt(leadId, 10);

  if (db.getMode() === 'postgresql') {
    const res = await db.query(
      'SELECT * FROM chat_transcripts WHERE lead_id = $1 ORDER BY created_at ASC',
      [numId]
    );
    if (res.rows.length > 0) {
      return res.rows.map(parseTranscriptRow);
    }
  } else {
    const list = db.localStore.getTable('chat_transcripts') || [];
    const leadMsgs = list.filter((m) => m.lead_id === numId);
    if (leadMsgs.length > 0) {
      leadMsgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return leadMsgs.map(parseTranscriptRow);
    }
  }

  // Fallback default message if no transcript row exists yet
  const lead = await leadService.getLeadById(numId);
  if (!lead) return [];

  return [
    {
      id: 1,
      lead_id: numId,
      sender: 'user',
      text: `Hello, I inquired via ${lead.source || 'Portal'} for a ${lead.preferred_bhk || 'residence'}.`,
      is_promotional: false,
      created_at: lead.created_at,
    },
    {
      id: 2,
      lead_id: numId,
      sender: 'assistant',
      text: `Welcome to Keshav Private Residences. Our advisory team is actively reviewing your inquiry.\n\n──────────────────────────────\n🏛️ Mandatory RERA: PRM/KA/RERA/1251/310/PR/210101/004001`,
      is_promotional: true,
      rera_number: 'PRM/KA/RERA/1251/310/PR/210101/004001',
      created_at: new Date(new Date(lead.created_at).getTime() + 60000).toISOString(),
    },
  ];
}

function parseTranscriptRow(row) {
  let toolCalls = null;
  if (row.tool_calls) {
    try {
      toolCalls = typeof row.tool_calls === 'string' ? JSON.parse(row.tool_calls) : row.tool_calls;
    } catch (e) {}
  }
  return {
    id: row.id,
    lead_id: row.lead_id,
    sender: row.sender, // 'user' | 'assistant' | 'executive'
    text: row.text,
    tool_calls: toolCalls,
    is_promotional: Boolean(row.is_promotional),
    rera_number: row.rera_number,
    created_at: row.created_at,
  };
}

/**
 * Take over chat: Halts AI responses and puts sales executive in control
 */
async function takeOverChat(leadId, executiveName = 'Sales Executive') {
  const numId = parseInt(leadId, 10);
  takeoverState[numId] = {
    isTakenOver: true,
    executiveName: executiveName || 'Sales Executive',
    takenOverAt: new Date().toISOString(),
  };

  // Add system notice to transcript
  await appendTranscriptMessage({
    lead_id: numId,
    sender: 'executive',
    text: `[SYSTEM NOTICE] Senior Residential Advisor (${executiveName}) has joined the conversation to provide direct personalized assistance.`,
    is_promotional: false,
  });

  console.log(`[Chat Takeover] Executive "${executiveName}" took over chat for Lead #${numId}`);
  return {
    success: true,
    lead_id: numId,
    is_taken_over: true,
    executive_name: executiveName,
    message: 'Chat successfully taken over. AI responses paused.',
  };
}

/**
 * Release chat: Resumes autonomous AI assistant control
 */
async function releaseChat(leadId) {
  const numId = parseInt(leadId, 10);
  takeoverState[numId] = {
    isTakenOver: false,
    executiveName: null,
    takenOverAt: null,
  };

  await appendTranscriptMessage({
    lead_id: numId,
    sender: 'assistant',
    text: `[SYSTEM NOTICE] Direct executive session ended. Keshav AI Assistant resumed.`,
    is_promotional: false,
  });

  console.log(`[Chat Release] Chat released back to AI for Lead #${numId}`);
  return {
    success: true,
    lead_id: numId,
    is_taken_over: false,
    message: 'Chat control returned to AI Assistant.',
  };
}

/**
 * Send message from Sales Executive directly to buyer
 */
async function sendExecutiveMessage(leadId, { text, executiveName = 'Sales Executive' }) {
  const numId = parseInt(leadId, 10);
  if (!text || !text.trim()) {
    throw new Error('Message text cannot be empty.');
  }

  const createdMsg = await appendTranscriptMessage({
    lead_id: numId,
    sender: 'executive',
    text: text.trim(),
    is_promotional: false,
  });

  return createdMsg;
}

/**
 * Append message row to chat_transcripts table/store
 */
async function appendTranscriptMessage({ lead_id, sender, text, tool_calls = null, is_promotional = false, rera_number = null }) {
  const now = new Date().toISOString();
  const toolCallsStr = tool_calls ? JSON.stringify(tool_calls) : null;

  if (db.getMode() === 'postgresql') {
    const sql = `
      INSERT INTO chat_transcripts (lead_id, sender, text, tool_calls, is_promotional, rera_number, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await db.query(sql, [lead_id, sender, text, toolCallsStr, is_promotional, rera_number, now]);
    return parseTranscriptRow(res.rows[0]);
  } else {
    const list = db.localStore.getTable('chat_transcripts');
    const newId = list.reduce((max, m) => Math.max(max, m.id || 0), 0) + 1;
    const newMsg = {
      id: newId,
      lead_id,
      sender,
      text,
      tool_calls: toolCallsStr,
      is_promotional,
      rera_number,
      created_at: now,
    };
    list.push(newMsg);
    db.localStore.writeData(db.localStore.data);
    return parseTranscriptRow(newMsg);
  }
}

module.exports = {
  getSourceTag,
  getStatusCategory,
  getInboxLeads,
  getLeadTranscript,
  takeOverChat,
  releaseChat,
  sendExecutiveMessage,
  appendTranscriptMessage,
  takeoverState,
};

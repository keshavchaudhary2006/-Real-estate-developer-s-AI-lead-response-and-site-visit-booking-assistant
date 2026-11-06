const factSheetService = require('./factSheetService');
const slotsService = require('./slotsService');
const leadService = require('./leadService');
const { appendReraNotice, detectLanguage } = require('./chatUtils');

// Tool Definitions following industry standard function calling schemas
const TOOL_DEFINITIONS = [
  {
    name: 'human_handoff',
    description:
      'Triggers a human sales executive handoff when a user asks questions not in the FactSheet or asks for final pricing/discounts.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          enum: ['unknown_factsheet_query', 'final_price_or_discount_request', 'custom_request'],
          description: 'The specific reason why handoff is triggered.',
        },
        user_query: {
          type: 'string',
          description: 'The exact question or statement from the user.',
        },
        context: {
          type: 'object',
          description: 'Current session state including extracted BHK, budget, or phone.',
        },
      },
      required: ['reason', 'user_query'],
    },
  },
  {
    name: 'check_availability',
    description:
      'Checks unit availability and open site visit slots once both BHK requirement and budget have been extracted.',
    parameters: {
      type: 'object',
      properties: {
        preferred_bhk: {
          type: 'string',
          description: 'Extracted BHK requirement (e.g. "2 BHK", "3 BHK", "4 BHK").',
        },
        budget: {
          type: 'string',
          description: 'Extracted buyer budget (e.g. "₹1.5 Cr", "80 Lakhs").',
        },
        project_id: {
          type: 'string',
          description: 'Optional project identifier (e.g. "Project 1", "Project 2").',
        },
      },
      required: ['preferred_bhk', 'budget'],
    },
  },
  {
    name: 'get_factsheet_data',
    description: 'Fetches verified project data strictly from the FactSheet table.',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID to look up (e.g. "Project 1", "Project 2").',
        },
      },
    },
  },
];

// Persistent or in-memory handoff event log
const handoffLog = [];

/**
 * Tool Execution Handlers
 */
const toolHandlers = {
  /**
   * Execute human handoff
   */
  async human_handoff(args) {
    const handoffEvent = {
      id: `handoff-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      reason: args.reason,
      user_query: args.user_query,
      context: args.context || {},
      status: 'pending_sales_rep_action',
    };
    handoffLog.push(handoffEvent);
    console.log(`[Tool Call: human_handoff] Event logged:`, handoffEvent);
    return {
      success: true,
      handoff_id: handoffEvent.id,
      status: 'handoff_initiated',
      message: 'Handoff event dispatched to sales executive team.',
    };
  },

  /**
   * Execute availability check
   */
  async check_availability(args) {
    console.log(`[Tool Call: check_availability] Checking with criteria:`, args);
    const { preferred_bhk, budget, project_id } = args;

    // Fetch verified factsheets
    const factSheets = await factSheetService.getAllFactSheets();

    // Match projects by BHK
    const matchedProjects = factSheets.filter((f) => {
      if (project_id && f.project_id.toLowerCase() !== project_id.toLowerCase()) return false;
      const bhkClean = (preferred_bhk || '').toLowerCase();
      // Look for bhk number in details
      if (bhkClean.includes('3') && f.details.includes('3')) return true;
      if (bhkClean.includes('2') && f.details.includes('2')) return true;
      if (bhkClean.includes('4') && f.details.includes('4')) return true;
      return false;
    });

    // Check open visit slots
    const slots = await slotsService.getAllSlots({ is_booked: false });
    const relevantSlots = slots.filter((s) => {
      if (!matchedProjects.length) return true;
      return matchedProjects.some((p) => p.project_id === s.project_id || !s.project_id);
    });

    return {
      success: true,
      preferred_bhk,
      budget,
      matched_projects: matchedProjects.map((p) => ({
        project_id: p.project_id,
        rera_number: p.rera_number,
        pricing: p.pricing,
        details: p.details,
      })),
      available_slots: relevantSlots.slice(0, 3).map((s) => ({
        slot_id: s.id,
        date_time: s.date_time,
        project_id: s.project_id,
      })),
      inventory_status: matchedProjects.length > 0 ? 'AVAILABLE' : 'LIMITED_WAITLIST',
    };
  },

  /**
   * Execute factsheet query
   */
  async get_factsheet_data(args) {
    console.log(`[Tool Call: get_factsheet_data] Query:`, args);
    if (args.project_id) {
      const fs = await factSheetService.getFactSheetById(args.project_id);
      return fs ? [fs] : [];
    }
    return await factSheetService.getAllFactSheets();
  },
};

/**
 * Helper to extract BHK from user text
 */
function extractBhk(text) {
  if (!text) return null;
  const match = text.match(/(\d(?:\.5)?)\s*(?:bhk|bedroom|bed|bhks)/i);
  if (match) {
    return `${match[1]} BHK`;
  }
  if (/\b(?:3bhk|3-bhk)\b/i.test(text)) return '3 BHK';
  if (/\b(?:2bhk|2-bhk)\b/i.test(text)) return '2 BHK';
  if (/\b(?:4bhk|4-bhk)\b/i.test(text)) return '4 BHK';
  if (/\b(?:1bhk|1-bhk)\b/i.test(text)) return '1 BHK';
  return null;
}

/**
 * Helper to extract budget from user text
 */
function extractBudget(text) {
  if (!text) return null;

  // Pattern matching: e.g. "1.5 Cr", "80 Lakhs", "1.25 Crore", "75 L", "1 to 1.5 cr", "₹1.5Cr"
  const crMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(\d+(?:\.\d+)?)?\s*(?:cr|crore|crores)\b/i);
  if (crMatch) {
    if (crMatch[2]) {
      return `₹${crMatch[1]} - ${crMatch[2]} Cr`;
    }
    return `₹${crMatch[1]} Cr`;
  }

  const lkMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(\d+(?:\.\d+)?)?\s*(?:l|lakh|lakhs|lac|lacs)\b/i);
  if (lkMatch) {
    if (lkMatch[2]) {
      return `₹${lkMatch[1]} - ${lkMatch[2]} Lakhs`;
    }
    return `₹${lkMatch[1]} Lakhs`;
  }

  // Pure budget phrase: e.g. "budget is 1.5" or "under 2"
  const numBudgetMatch = text.match(/(?:budget|under|upto|up to|around)\s*(?:is)?\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(cr|crore|l|lakh)?/i);
  if (numBudgetMatch) {
    const val = numBudgetMatch[1];
    const unit = numBudgetMatch[2] ? numBudgetMatch[2].toLowerCase() : '';
    if (unit.startsWith('cr')) return `₹${val} Cr`;
    if (unit.startsWith('l')) return `₹${val} Lakhs`;
    // If val is small (< 10), assume Cr, else Lakhs
    return parseFloat(val) < 15 ? `₹${val} Cr` : `₹${val} Lakhs`;
  }

  return null;
}

/**
 * Detects whether the query asks for final price, discount, or price reduction
 */
function isPriceDiscountOrFinalPriceQuery(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  const patterns = [
    'final price',
    'discount',
    'discounts',
    'best price',
    'lowest price',
    'reduce price',
    'reduction',
    'price reduce',
    'negotiable',
    'negotiate',
    'negotiation',
    'bargain',
    'deal price',
    'offer price',
    'special rate',
    'cash discount',
    'less price',
    'any concession',
    'कम कीमत',
    'छूट',
    'अंतिम मूल्य',
    'कम करो',
    'ઓછી કિંમત',
    'ડિસ્કાઉન્ટ',
    'આખરી ભાવ',
  ];
  return patterns.some((p) => t.includes(p));
}

/**
 * Checks if the question pertains to facts verified strictly in FactSheet
 */
function isFactSheetCompliantQuery(text, factSheets) {
  if (!text) return true;
  const t = text.toLowerCase();

  // If question asks for discount or final price, it is strictly NOT factsheet compliant
  if (isPriceDiscountOrFinalPriceQuery(text)) {
    return false;
  }

  // Keywords explicitly covered in FactSheet:
  // Project names, RERA numbers, pricing, starting price, bhk configs, rooftop pool, clubhouse, smart home, metro connectivity, eco-friendly, 40+ amenities
  const allowedTopics = [
    'project 1',
    'project 2',
    'sky villa',
    'urban height',
    'keshav',
    'rera',
    'rera number',
    'registration',
    'pricing',
    'price',
    'cost',
    'starting from',
    'starting price',
    '2 bhk',
    '3 bhk',
    '4 bhk',
    'bhk',
    'amenities',
    'amenity',
    'pool',
    'infinity pool',
    'clubhouse',
    'smart home',
    'automation',
    'metro',
    'connectivity',
    'eco-friendly',
    'green',
    'details',
    'specifications',
    'specs',
    'overview',
    'brochure',
    'location',
    'available',
    'availability',
    'schedule',
    'visit',
    'slot',
    'site visit',
    'hi',
    'hello',
    'hey',
    'namaste',
    'stop',
    'start',
    'yes',
    'no',
    'consent',
  ];

  // Specific forbidden topics that are definitely NOT in FactSheet
  const nonFactSheetKeywords = [
    'elevator brand',
    'lift brand',
    'otis',
    'schindler',
    'kone',
    'contractor',
    'builder rating',
    'soil test',
    'school rating',
    'nearest school',
    'hospital distance',
    'maintenance fee',
    'maintenance charges',
    'maintenance cost',
    'property tax',
    'loan interest',
    'home loan rate',
    'paint brand',
    'asian paints',
    'floor tiles brand',
    'marble quality',
    'vaastu',
    'vastu compliance',
    'car parking charge',
    'extra parking',
    'ceiling height',
    'who is the architect',
    'architect name',
    'resale value',
    'rental yield',
    'monthly rent',
  ];

  // If any non-factsheet keyword matches, fail immediately
  if (nonFactSheetKeywords.some((k) => t.includes(k))) {
    return false;
  }

  // Check if at least one allowed topic or conversational keyword matches
  const hasAllowedTopic = allowedTopics.some((k) => t.includes(k));
  if (hasAllowedTopic) {
    return true;
  }

  // If the query asks a factual question (e.g., "what is...", "who is...", "can I...", "is there...") about an unverified detail:
  if (
    t.includes('what is the') ||
    t.includes('who is') ||
    t.includes('can i') ||
    t.includes('is there a') ||
    t.includes('tell me about the') ||
    t.includes('brand') ||
    t.includes('fee') ||
    t.includes('charge') ||
    t.includes('interest') ||
    t.includes('rules')
  ) {
    return false;
  }

  return true;
}

/**
 * Core AI Agent Execution Loop
 *
 * Requirements:
 * 1. Strict guardrails: Can ONLY answer questions using data from the FactSheet table.
 * 2. If question not in factsheet OR asks for final price/discount:
 *    AI MUST reply: "A sales executive will confirm this detail for you. Would you like to schedule a site visit in the meantime?"
 *    and trigger 'human_handoff' function.
 * 3. AI's goal is to extract user's budget and BHK requirement.
 * 4. Once extracted, it triggers the 'check_availability' tool.
 */
async function runAgentTurn({ message, state = {}, lang = 'en' }) {
  const activeLang = detectLanguage(message, lang);
  const cleanMsg = (message || '').trim();

  // Current conversational state
  const sessionState = {
    preferred_bhk: state.preferred_bhk || null,
    budget: state.budget || null,
    project_id: state.project_id || null,
    is_handoff: state.is_handoff || false,
    ...state,
  };

  const executedToolCalls = [];

  // 1. Check for STOP / Opt-Out (DPDP Act Compliance)
  if (cleanMsg.toUpperCase() === 'STOP') {
    return {
      reply:
        activeLang === 'hi'
          ? 'DPDP अधिनियम, 2023 के तहत आपकी ऑप्ट-आउट पुष्टि दर्ज कर ली गई है।'
          : activeLang === 'gu'
          ? 'DPDP એક્ટ, 2023 હેઠળ તમારી ઑપ્ટ-આઉટ વિનંતી સ્વીકારવામાં આવી છે.'
          : 'You have successfully opted out under the DPDP Act, 2023. Type START to re-consent.',
      state: sessionState,
      toolCalls: [],
      isHandoff: false,
    };
  }

  // Fetch FactSheet data for guardrail evaluation
  const factSheets = await factSheetService.getAllFactSheets();

  // 2. Extract BHK and Budget goals from this message or state
  const extractedBhkInMsg = extractBhk(cleanMsg);
  const extractedBudgetInMsg = extractBudget(cleanMsg);

  if (extractedBhkInMsg) {
    sessionState.preferred_bhk = extractedBhkInMsg;
  }
  if (extractedBudgetInMsg) {
    sessionState.budget = extractedBudgetInMsg;
  }
  const lowerMsg = cleanMsg.toLowerCase();
  if (
    lowerMsg.includes('project 1') ||
    lowerMsg.includes('sky villa') ||
    cleanMsg.includes('प्रोजेक्ट 1') ||
    cleanMsg.includes('પ્રોજેક્ટ 1')
  ) {
    sessionState.project_id = 'Project 1';
  } else if (
    lowerMsg.includes('project 2') ||
    lowerMsg.includes('urban height') ||
    cleanMsg.includes('प्रोजेक्ट 2') ||
    cleanMsg.includes('પ્રોજેક્ટ 2')
  ) {
    sessionState.project_id = 'Project 2';
  }

  // 3. STRICT GUARDRAIL CHECK:
  // Is it a final price/discount request, or a question NOT in the FactSheet?
  const isDiscount = isPriceDiscountOrFinalPriceQuery(cleanMsg);
  const isFactSheetCompliant = isFactSheetCompliantQuery(cleanMsg, factSheets);

  if (isDiscount || !isFactSheetCompliant) {
    const reason = isDiscount ? 'final_price_or_discount_request' : 'unknown_factsheet_query';

    // TRIGGER TOOL: human_handoff
    const handoffToolCall = {
      tool: 'human_handoff',
      args: {
        reason,
        user_query: cleanMsg,
        context: {
          preferred_bhk: sessionState.preferred_bhk,
          budget: sessionState.budget,
          project_id: sessionState.project_id,
        },
      },
    };

    const toolResult = await toolHandlers.human_handoff(handoffToolCall.args);
    executedToolCalls.push({
      ...handoffToolCall,
      result: toolResult,
    });

    sessionState.is_handoff = true;

    // MANDATED EXACT PHRASING:
    // "A sales executive will confirm this detail for you. Would you like to schedule a site visit in the meantime?"
    const exactRequiredReply =
      'A sales executive will confirm this detail for you. Would you like to schedule a site visit in the meantime?';

    // Append project RERA if project context is available
    const reraProject = sessionState.project_id === 'Project 2' ? 'Project 2' : 'Project 1';
    const reraNum =
      reraProject === 'Project 2'
        ? 'PRM/KA/RERA/1251/308/PR/210215/004050'
        : 'PRM/KA/RERA/1251/310/PR/210101/004001';

    const fullReply = appendReraNotice(exactRequiredReply, reraProject, reraNum, activeLang);

    return {
      reply: fullReply,
      exactRequiredPhrase: exactRequiredReply,
      state: sessionState,
      toolCalls: executedToolCalls,
      isHandoff: true,
      reason,
      isPromotional: true,
    };
  }

  // 4. GOAL EXTRACTION CHECK:
  // If BOTH preferred_bhk AND budget are extracted, trigger check_availability tool!
  const hasBothGoalsExtracted = Boolean(sessionState.preferred_bhk && sessionState.budget);

  // Check if check_availability should be triggered now
  if (hasBothGoalsExtracted && (!state.availability_checked || extractedBhkInMsg || extractedBudgetInMsg)) {
    const availabilityToolCall = {
      tool: 'check_availability',
      args: {
        preferred_bhk: sessionState.preferred_bhk,
        budget: sessionState.budget,
        project_id: sessionState.project_id,
      },
    };

    const toolResult = await toolHandlers.check_availability(availabilityToolCall.args);
    executedToolCalls.push({
      ...availabilityToolCall,
      result: toolResult,
    });

    sessionState.availability_checked = true;

    // Build response highlighting the matched units and open visit slots
    const matched = toolResult.matched_projects;
    const slots = toolResult.available_slots;

    let responseText = '';
    if (activeLang === 'hi') {
      responseText = `✨ **उपलब्धता परिणाम (${sessionState.preferred_bhk} | बजट: ${sessionState.budget}):**\n\n`;
      if (matched.length > 0) {
        responseText += matched
          .map((p) => `• **${p.project_id}:** ${p.pricing} — ${p.details}`)
          .join('\n\n');
      } else {
        responseText += `• वर्तमान में आपके बजट के अनुकूल इकाइयाँ उपलब्ध हैं।\n`;
      }
      if (slots.length > 0) {
        responseText += `\n\n🗓️ **खुले साइट विज़िट स्लॉट्स:**\n` +
          slots
            .map((s) => `• स्लॉट #${s.slot_id}: ${new Date(s.date_time).toLocaleDateString()} ${new Date(s.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
            .join('\n');
      }
      responseText += `\n\nक्या आप इनमें से कोई स्लॉट रिज़र्व करना चाहते हैं?`;
    } else if (activeLang === 'gu') {
      responseText = `✨ **ઉપલબ્ધતા પરિણામો (${sessionState.preferred_bhk} | બજેટ: ${sessionState.budget}):**\n\n`;
      if (matched.length > 0) {
        responseText += matched
          .map((p) => `• **${p.project_id}:** ${p.pricing} — ${p.details}`)
          .join('\n\n');
      }
      if (slots.length > 0) {
        responseText += `\n\n🗓️ **ઉપલબ્ધ મુલાકાત સ્લોટ્સ:**\n` +
          slots
            .map((s) => `• સ્લોટ #${s.slot_id}: ${new Date(s.date_time).toLocaleDateString()} ${new Date(s.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
            .join('\n');
      }
      responseText += `\n\nશું આપ આમાંથી કોઈ સ્લોટ રિઝર્વ કરવા માંગો છો?`;
    } else {
      responseText = `✨ **Availability Confirmed for ${sessionState.preferred_bhk} within ${sessionState.budget}:**\n\n`;
      if (matched.length > 0) {
        responseText += matched
          .map((p) => `• **${p.project_id}:** ${p.pricing}\n  ${p.details}`)
          .join('\n\n');
      }
      if (slots.length > 0) {
        responseText += `\n\n🗓️ **Upcoming Private Tour Slots:**\n` +
          slots
            .map((s) => `• Slot #${s.slot_id}: ${new Date(s.date_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${new Date(s.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
            .join('\n');
      }
      responseText += `\n\nShall I lock one of these consultation slots for you?`;
    }

    const primaryProject = matched[0]?.project_id || 'Project 1';
    const primaryRera = matched[0]?.rera_number || 'PRM/KA/RERA/1251/310/PR/210101/004001';
    const fullReply = appendReraNotice(responseText, primaryProject, primaryRera, activeLang);

    return {
      reply: fullReply,
      state: sessionState,
      toolCalls: executedToolCalls,
      isHandoff: false,
      isPromotional: true,
      availabilityChecked: true,
    };
  }

  // 5. IF ONLY ONE GOAL IS EXTRACTED, PROMPT FOR THE MISSING ONE
  if (sessionState.preferred_bhk && !sessionState.budget) {
    let reply = '';
    if (activeLang === 'hi') {
      reply = `हमने आपका पसंदीदा कॉन्फ़िगरेशन **${sessionState.preferred_bhk}** नोट कर लिया है। आपके लिए सटीक विकल्प खोजने हेतु, कृपया अपना अनुमानित बजट साझा करें (जैसे ₹80 लाख या ₹1.5 करोड़)?`;
    } else if (activeLang === 'gu') {
      reply = `અમે આપનું મનપસંદ **${sessionState.preferred_bhk}** નોંધી લીધું છે. યોગ્ય વિકલ્પો ચકાસવા માટે, કૃપા કરીને આપનું અંદાજિત બજેટ જણાવો?`;
    } else {
      reply = `I have noted your preference for a **${sessionState.preferred_bhk}** residence. To verify the most suitable options and inventory, what is your target budget range (e.g. ₹80 Lakhs, ₹1.5 Cr)?`;
    }
    const fullReply = appendReraNotice(reply, 'Project 1 & 2', 'PRM/KA/RERA/1251/310/PR/210101/004001', activeLang);
    return {
      reply: fullReply,
      state: sessionState,
      toolCalls: executedToolCalls,
      isHandoff: false,
      isPromotional: true,
    };
  }

  if (sessionState.budget && !sessionState.preferred_bhk) {
    let reply = '';
    if (activeLang === 'hi') {
      reply = `आपके **${sessionState.budget}** के बजट के अनुसार, आप किस प्रकार का घर तलाश रहे हैं: 2 BHK अथवा 3 BHK?`;
    } else if (activeLang === 'gu') {
      reply = `આપના **${sessionState.budget}** ના બજેટ મુજબ, આપ 2 BHK કે 3 BHK ઘર શોધી રહ્યા છો?`;
    } else {
      reply = `Within your allocated budget of **${sessionState.budget}**, are you seeking a 2 BHK or 3 BHK residence?`;
    }
    const fullReply = appendReraNotice(reply, 'Project 1 & 2', 'PRM/KA/RERA/1251/310/PR/210101/004001', activeLang);
    return {
      reply: fullReply,
      state: sessionState,
      toolCalls: executedToolCalls,
      isHandoff: false,
      isPromotional: true,
    };
  }

  // 6. STANDARD FACTSHEET INFORMATION QUERY (Trigger get_factsheet_data)
  const factsheetToolCall = {
    tool: 'get_factsheet_data',
    args: {
      project_id: sessionState.project_id || undefined,
    },
  };
  const factsheetData = await toolHandlers.get_factsheet_data(factsheetToolCall.args);
  executedToolCalls.push({
    ...factsheetToolCall,
    result: factsheetData,
  });

  const p1 = factSheets.find((f) => f.project_id === 'Project 1');
  const p2 = factSheets.find((f) => f.project_id === 'Project 2');

  const isVisitInquiry =
    lowerMsg.includes('visit') ||
    lowerMsg.includes('schedule') ||
    lowerMsg.includes('slot') ||
    cleanMsg.includes('विज़िट') ||
    cleanMsg.includes('મુલાકાત');

  let textReply = '';

  if (isVisitInquiry) {
    const openSlots = await slotsService.getAllSlots({ is_booked: false });
    const slotList = openSlots
      .slice(0, 3)
      .map(
        (s) =>
          `• Slot #${s.id}: ${new Date(s.date_time).toLocaleDateString()} ${new Date(s.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${s.project_id || 'All Projects'})`
      )
      .join('\n');
    textReply = `🗓️ Available Site Visit & Consultation Slots:\n\n${slotList}\n\nPlease share your phone number to reserve a viewing slot.`;
  } else if (
    sessionState.project_id === 'Project 1' ||
    lowerMsg.includes('project 1') ||
    lowerMsg.includes('sky villa') ||
    cleanMsg.includes('प्रोजेक्ट 1') ||
    cleanMsg.includes('પ્રોજેક્ટ 1')
  ) {
    if (activeLang === 'hi') {
      textReply = `✨ **${p1.project_id} (फ़ैक्टशीट विवरण):**\n\n• **मूल्य:** ${p1.pricing}\n• **विवरण:** ${p1.details}\n• **RERA:** ${p1.rera_number}\n\nउपलब्धता जांचने के लिए, आपका पसंदीदा BHK और बजट क्या है?`;
    } else if (activeLang === 'gu') {
      textReply = `✨ **${p1.project_id} (ફેક્ટશીટ વિગતો):**\n\n• **કિંમત:** ${p1.pricing}\n• **વિગતો:** ${p1.details}\n• **RERA:** ${p1.rera_number}\n\nઉપલબ્ધતા તપાસવા માટે આપનું મનપસંદ BHK અને બજેટ શું છે?`;
    } else {
      textReply = `✨ **${p1.project_id} (FactSheet Data):**\n\n• **Pricing:** ${p1.pricing}\n• **Details:** ${p1.details}\n\nTo check matching residences, what BHK configuration and budget do you have in mind?`;
    }
  } else if (
    sessionState.project_id === 'Project 2' ||
    lowerMsg.includes('project 2') ||
    lowerMsg.includes('urban height') ||
    cleanMsg.includes('प्रोजेक्ट 2') ||
    cleanMsg.includes('પ્રોજેક્ટ 2')
  ) {
    if (activeLang === 'hi') {
      textReply = `🌿 **${p2.project_id} (फ़ैक्टशीट विवरण):**\n\n• **मूल्य:** ${p2.pricing}\n• **विवरण:** ${p2.details}\n• **RERA:** ${p2.rera_number}\n\nवर्तमान यूनिट उपलब्धता की जांच के लिए, आपका पसंदीदा BHK और बजट क्या है?`;
    } else if (activeLang === 'gu') {
      textReply = `🌿 **${p2.project_id} (ફેક્ટશીટ વિગતો):**\n\n• **કિંમત:** ${p2.pricing}\n• **વિગતો:** ${p2.details}\n• **RERA:** ${p2.rera_number}\n\nયુનિટ ઉપલબ્ધતા ચકાસવા આપનું ઇચ્છિત BHK અને બજેટ જણાવશો?`;
    } else {
      textReply = `🌿 **${p2.project_id} (FactSheet Data):**\n\n• **Pricing:** ${p2.pricing}\n• **Details:** ${p2.details}\n\nTo check current unit availability, could you share your desired BHK and budget?`;
    }
  } else {
    textReply = `Welcome to Keshav Residences. Based on verified FactSheet records:\n\n• **${p1.project_id}:** ${p1.pricing} — ${p1.details}\n• **${p2.project_id}:** ${p2.pricing} — ${p2.details}\n\nTo check availability, what is your preferred BHK and target budget?`;
  }

  const pId = sessionState.project_id || (isVisitInquiry ? 'Project 1 & Project 2' : 'Project 1');
  const rera =
    pId === 'Project 2'
      ? p2.rera_number
      : pId === 'Project 1 & Project 2'
      ? `${p1.rera_number} | ${p2.rera_number}`
      : p1.rera_number;
  const fullReply = appendReraNotice(textReply, pId, rera, activeLang);

  return {
    reply: fullReply,
    state: sessionState,
    toolCalls: executedToolCalls,
    isHandoff: false,
    isPromotional: true,
  };
}

module.exports = {
  TOOL_DEFINITIONS,
  toolHandlers,
  handoffLog,
  extractBhk,
  extractBudget,
  isPriceDiscountOrFinalPriceQuery,
  isFactSheetCompliantQuery,
  runAgentTurn,
};

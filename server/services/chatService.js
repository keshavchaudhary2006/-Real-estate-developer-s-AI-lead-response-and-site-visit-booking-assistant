const factSheetService = require('./factSheetService');
const leadService = require('./leadService');
const slotsService = require('./slotsService');
const agentService = require('./agentService');
const { DICTIONARY, appendReraNotice, detectLanguage } = require('./chatUtils');

/**
 * Process incoming chat messages using the Agent Engine with Tool Calling & Guardrails
 */
async function processChatMessage({ message, state = {}, lang = 'en', hasConsented = false }) {
  const cleanMsg = (message || '').trim();
  const upper = cleanMsg.toUpperCase();
  const activeLang = detectLanguage(cleanMsg, lang);
  const dict = DICTIONARY[activeLang] || DICTIONARY.en;

  // 1. DPDP Act STOP / Opt-Out command
  if (upper === 'STOP' || upper === 'UNSUBSCRIBE' || upper === 'OPT OUT' || upper === 'OPTOUT') {
    return {
      reply: dict.optedOutMessage,
      isPromotional: false,
      lang: activeLang,
      consentStatus: 'opted_out',
      quickReplies: ['START (Re-consent)', activeLang === 'hi' ? 'मुख्य मेन्यू' : activeLang === 'gu' ? 'મુખ્ય મેનુ' : 'Main Menu'],
      toolCalls: [],
      state,
    };
  }

  // 2. DPDP Act START / Re-consent command
  if (upper === 'START' || upper === 'CONSENT' || upper === 'YES' || cleanMsg === dict.consentBtn) {
    return {
      reply: dict.reconsentedMessage,
      isPromotional: false,
      lang: activeLang,
      consentStatus: 'consented',
      quickReplies: dict.quickReplies,
      toolCalls: [],
      state,
    };
  }

  // 3. Priority Check: Phone number extraction with duplicate check & merge
  const phoneMatch = cleanMsg.match(/(\+?\d[\d\s-]{8,14}\d)/);
  if (phoneMatch) {
    const rawPhone = phoneMatch[0];
    try {
      const bhkExtracted = agentService.extractBhk(cleanMsg) || state.preferred_bhk || '3 BHK';
      const budgetExtracted = agentService.extractBudget(cleanMsg) || state.budget || '₹1.25 - 1.5 Cr';
      const projExtracted = cleanMsg.toLowerCase().includes('project 2') ? 'Project 2' : 'Project 1';

      const leadResult = await leadService.createOrMergeLead({
        name: cleanMsg.replace(rawPhone, '').replace(/[,\-:()]/g, '').trim() || 'Valued Buyer',
        phone: rawPhone,
        source: 'Mobile Web Chat (DPDP Consented)',
        preferred_bhk: bhkExtracted,
        budget: budgetExtracted,
        status: 'Site Visit Requested',
        project_id: projExtracted,
      });

      let confirmation = '';
      if (activeLang === 'hi') {
        confirmation = leadResult.merged
          ? `✅ **सहमति एवं डेटा अपडेट दर्ज!**\n\nआपके फ़ोन (${rawPhone}) से संबंधित विवरण अपडेट कर दिए गए हैं। हमारे सीनियर एडवाइज़र शीघ्र ही आपसे संपर्क करेंगे।\n\n*(DPDP अधिनियम 2023 के तहत आप कभी भी 'STOP' लिखकर ऑप्ट-आउट कर सकते हैं।)*`
          : `✅ **सहमति एवं स्लॉट अनुरोध दर्ज!**\n\nधन्यवाद! आपकी विज़िट का अनुरोध दर्ज कर लिया गया है। हमारे एडवाइज़र शीघ्र संपर्क करेंगे।\n\n*(DPDP अधिनियम 2023 के तहत आप कभी भी 'STOP' लिखकर ऑप्ट-आउट कर सकते हैं।)*`;
      } else if (activeLang === 'gu') {
        confirmation = leadResult.merged
          ? `✅ **વિગતો સફળતાપૂર્વક અપડેટ થઈ!**\n\nતમારા ફોન (${rawPhone}) સાથે સંકળાયેલી વિગતો અપડેટ થઈ ગઈ છે. અમારા સલાહકાર ટૂંક સમયમાં સંપર્ક કરશે.\n\n*(DPDP એક્ટ 2023 હેઠળ તમે ગમે ત્યારે 'STOP' લખીને રદ કરી શકો છો.)*`
          : `✅ **વિનંતી સફળતાપૂર્વક નોંધાઈ ગઈ!**\n\nઆભાર! તમારો સંપર્ક નંબર સુરક્ષિત રીતે નોંધાયેલ છે. અમે ટૂંક સમયમાં સંપર્ક કરીશું.\n\n*(DPDP એક્ટ 2023 હેઠળ તમે ગમે ત્યારે 'STOP' લખીને રદ કરી શકો છો.)*`;
      } else {
        confirmation = leadResult.merged
          ? `✅ **Inquiry & Profile Updated!**\n\nYour contact record (${rawPhone}) has been seamlessly merged and updated. Our senior residential advisor will reach out to confirm your private viewing.\n\n*(As per DPDP Act, 2023, you retain the right to type 'STOP' at any time to purge marketing preferences.)*`
          : `✅ **Consultation Request Confirmed!**\n\nThank you. Your contact (${rawPhone}) is safely logged under DPDP Act standards. Our private residence concierge will connect with you shortly.\n\n*(Type 'STOP' anytime to withdraw consent).*`;
      }

      const reraNum = projExtracted === 'Project 2' ? 'PRM/KA/RERA/1251/308/PR/210215/004050' : 'PRM/KA/RERA/1251/310/PR/210101/004001';
      const fullReply = appendReraNotice(confirmation, projExtracted, reraNum, activeLang);

      return {
        reply: fullReply,
        isPromotional: true,
        projectId: projExtracted,
        reraNumber: reraNum,
        leadId: leadResult.lead.id,
        merged: leadResult.merged,
        lang: activeLang,
        toolCalls: [],
        state: { ...state, preferred_bhk: bhkExtracted, budget: budgetExtracted, project_id: projExtracted },
        quickReplies: [
          activeLang === 'hi' ? 'प्रोजेक्ट 1 देखें' : activeLang === 'gu' ? 'પ્રોજેક્ટ 1 જુઓ' : 'View Project 1',
          activeLang === 'hi' ? 'प्रोजेक्ट 2 देखें' : activeLang === 'gu' ? 'પ્રોજેક્ટ 2 જુઓ' : 'View Project 2',
          'STOP (Opt Out)',
        ],
      };
    } catch (e) {
      console.error('Lead capture error:', e);
    }
  }

  // 4. Delegate to AI Agent Engine with Tool Calling, FactSheet Guardrails, & Availability Trigger
  const agentResult = await agentService.runAgentTurn({
    message: cleanMsg,
    state,
    lang: activeLang,
  });

  return {
    reply: agentResult.reply,
    exactRequiredPhrase: agentResult.exactRequiredPhrase,
    isPromotional: agentResult.isPromotional,
    isHandoff: agentResult.isHandoff,
    reason: agentResult.reason,
    availabilityChecked: agentResult.availabilityChecked,
    toolCalls: agentResult.toolCalls,
    state: agentResult.state,
    lang: activeLang,
    quickReplies: agentResult.isHandoff
      ? ['Schedule Site Visit', 'View Project 1 Details', 'STOP (Opt Out)']
      : agentResult.availabilityChecked
      ? ['Lock Visit Slot (15 min)', 'Share Contact: 9876543210', 'STOP (Opt Out)']
      : dict.quickReplies,
  };
}

module.exports = {
  DICTIONARY,
  appendReraNotice,
  detectLanguage,
  processChatMessage,
};

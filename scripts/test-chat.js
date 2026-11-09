const assert = require('assert');
const chatService = require('../server/services/chatService');
const db = require('../db');

async function testChatService() {
  console.log('====================================================');
  console.log('📱 Testing Mobile Buyer Web Chat Engine');
  console.log('   - DPDP Act Compliance & STOP opt-out');
  console.log('   - Multilingual Support (EN, HI, GU)');
  console.log('   - Mandatory RERA Number Appending on Promotions');
  console.log('====================================================\n');

  await db.initDb();
  await db.seedDb();

  let passed = 0;
  let total = 0;

  function runTest(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(e);
    }
  }

  async function runTestAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(e);
    }
  }

  // 1. Promotional Message RERA Check: Project 1 in English
  await runTestAsync('1. RERA Appending: Promotional query for Project 1 includes RERA number', async () => {
    const res = await chatService.processChatMessage({
      message: 'Can you share details and pricing for Project 1 (Sky Villas)?',
      lang: 'en',
    });

    assert(res.isPromotional, 'Should be flagged as promotional');
    assert(res.reply.includes('PRM/KA/RERA/1251/310/PR/210101/004001'), 'Must include Project 1 RERA registration number');
    assert(res.reply.includes('Official RERA Registration Number'), 'Must include standard RERA header');
    assert(res.reply.includes('1.25 Cr'), 'Must include pricing');
  });

  // 2. Promotional Message RERA Check: Project 2 in Hindi
  await runTestAsync('2. Multilingual (Hindi) + RERA: Project 2 inquiry in Hindi', async () => {
    const res = await chatService.processChatMessage({
      message: 'प्रोजेक्ट 2 अर्बन हाइट्स का क्या भाव है?',
      lang: 'hi',
    });

    assert(res.isPromotional, 'Should be promotional');
    assert.strictEqual(res.lang, 'hi', 'Language should be Hindi');
    assert(res.reply.includes('PRM/KA/RERA/1251/308/PR/210215/004050'), 'Must include Project 2 RERA number');
    assert(res.reply.includes('आधिकारिक RERA पंजीकरण संख्या'), 'Must include Hindi RERA badge');
    assert(res.reply.includes('75 Lakhs') || res.reply.includes('75 लाख'), 'Must include pricing');
  });

  // 3. Promotional Message RERA Check: Gujarati
  await runTestAsync('3. Multilingual (Gujarati) + RERA: Project 1 inquiry in Gujarati', async () => {
    const res = await chatService.processChatMessage({
      message: 'પ્રોજેક્ટ 1 સ્કાય વિલા વિશે વિગતો આપો',
      lang: 'gu',
    });

    assert(res.isPromotional, 'Should be promotional');
    assert.strictEqual(res.lang, 'gu', 'Language should be Gujarati');
    assert(res.reply.includes('PRM/KA/RERA/1251/310/PR/210101/004001'), 'Must include Project 1 RERA number in Gujarati reply');
    assert(res.reply.includes('સત્તાવાર RERA નોંધણી ક્રમાંક'), 'Must include Gujarati RERA badge');
  });

  // 4. DPDP Act Compliance: 'STOP' Opt-Out command
  await runTestAsync('4. DPDP Compliance: Typing "STOP" immediately opts out user', async () => {
    const res = await chatService.processChatMessage({
      message: 'STOP',
      lang: 'en',
    });

    assert.strictEqual(res.consentStatus, 'opted_out', 'Status must be opted_out');
    assert.strictEqual(res.isPromotional, false, 'Opt-out confirmation should not be promotional');
    assert(res.reply.includes('DPDP Act, 2023'), 'Must cite DPDP Act 2023 in opt-out confirmation');
    assert(res.reply.includes('START'), 'Must inform user how to re-consent');
  });

  // 5. DPDP Act Compliance: 'STOP' command in Hindi
  await runTestAsync('5. DPDP Compliance: Typing "STOP" with Hindi session', async () => {
    const res = await chatService.processChatMessage({
      message: 'stop',
      lang: 'hi',
    });

    assert.strictEqual(res.consentStatus, 'opted_out');
    assert(res.reply.includes('DPDP अधिनियम, 2023'), 'Must contain Hindi DPDP Act notice');
  });

  // 6. DPDP Re-consent: 'START' command
  await runTestAsync('6. DPDP Compliance: Typing "START" re-activates consent', async () => {
    const res = await chatService.processChatMessage({
      message: 'START',
      lang: 'en',
    });

    assert.strictEqual(res.consentStatus, 'consented');
    assert(res.reply.includes('DPDP Act, 2023'));
  });

  // 7. Site Visit Slot Inquiry with RERA Notice
  await runTestAsync('7. Site Visit Scheduling: Includes available slots & RERA registration', async () => {
    const res = await chatService.processChatMessage({
      message: 'I want to schedule a private site visit this weekend',
      lang: 'en',
    });

    assert(res.isPromotional);
    assert(res.reply.includes('Slot #'), 'Must list slots');
    assert(res.reply.includes('PRM/KA/RERA'), 'Must include RERA registration number');
  });

  // 8. Lead Capture with Phone Deduplication via Chat
  await runTestAsync('8. Lead Deduplication: Chat preserves and merges returning buyer (Hardik Patel)', async () => {
    const res = await chatService.processChatMessage({
      message: 'My contact number is 9876543210 and I want a 3 BHK in Project 1',
      lang: 'en',
    });

    assert(res.merged, 'Should detect existing lead Hardik Patel and merge');
    assert.strictEqual(res.leadId, 1, 'Should preserve ID #1');
    assert(res.reply.includes('PRM/KA/RERA'), 'Must include RERA registration number');
  });

  console.log('\n====================================================');
  console.log(`🏁 Chat Engine Test Summary: ${passed}/${total} passed successfully.`);
  console.log('====================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testChatService();

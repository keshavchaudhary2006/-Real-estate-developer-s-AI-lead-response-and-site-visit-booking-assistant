const { app } = require('../server/index');
const db = require('../db');
const inboxService = require('../server/services/inboxService');

// In-memory request dispatcher for Express routes
function dispatch(app, method, url, body = {}, query = {}) {
  return new Promise((resolve) => {
    const req = {
      method: method.toUpperCase(),
      url: url,
      originalUrl: url,
      path: url.split('?')[0],
      query: query,
      body: body,
      headers: { 'content-type': 'application/json' },
      get: (header) => (header.toLowerCase() === 'content-type' ? 'application/json' : ''),
    };

    let statusCode = 200;
    let responseData = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        resolve({ statusCode, body: data });
        return this;
      },
      send(data) {
        responseData = data;
        resolve({ statusCode, body: data });
        return this;
      },
      setHeader() {},
      end() {
        resolve({ statusCode, body: responseData });
      },
    };

    app(req, res);
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function testInbox() {
  console.log('====================================================');
  console.log('📬 Testing Sales Executive Unified Lead Inbox');
  console.log('   - Lead List with Source Tags (Portal, Ads, Hoarding)');
  console.log('   - Subtle Accent Status Categories (Hot, Visited, Cold)');
  console.log('   - Split View Structured Lead Data');
  console.log('   - Full AI Chat Transcript');
  console.log('   - Prominent Chat Takeover & Release Protocol');
  console.log('   - Live Executive Direct Messaging');
  console.log('====================================================\n');

  await db.initDb();
  await db.seedDb();

  // Test 1: Service Unit Tests for Tag Normalization
  console.log('--- 1. Tag & Status Category Normalization ---');
  assert(inboxService.getSourceTag('Property portal') === 'Portal', 'Source "Property portal" maps to "Portal"');
  assert(inboxService.getSourceTag('MagicBricks') === 'Portal', 'Source "MagicBricks" maps to "Portal"');
  assert(inboxService.getSourceTag('Social media ad') === 'Ads', 'Source "Social media ad" maps to "Ads"');
  assert(inboxService.getSourceTag('Instagram ad') === 'Ads', 'Source "Instagram ad" maps to "Ads"');
  assert(inboxService.getSourceTag('Hoarding call') === 'Hoarding', 'Source "Hoarding call" maps to "Hoarding"');
  assert(inboxService.getSourceTag('Billboard highway') === 'Hoarding', 'Source "Billboard highway" maps to "Hoarding"');
  assert(inboxService.getSourceTag('Walk-in') === 'Direct', 'Source "Walk-in" maps to "Direct"');

  assert(inboxService.getStatusCategory('Booked') === 'Hot', 'Status "Booked" maps to category "Hot"');
  assert(inboxService.getStatusCategory('Hot Lead') === 'Hot', 'Status "Hot Lead" maps to category "Hot"');
  assert(inboxService.getStatusCategory('Visited') === 'Visited', 'Status "Visited" maps to category "Visited"');
  assert(inboxService.getStatusCategory('Not booked') === 'Cold', 'Status "Not booked" maps to category "Cold"');

  // Test 2: GET /api/inbox/leads Express Route
  console.log('\n--- 2. GET /api/inbox/leads API Endpoint ---');
  const inboxRes = await dispatch(app, 'GET', '/api/inbox/leads');
  assert(inboxRes.statusCode === 200, `GET /api/inbox/leads returns 200 OK`);
  assert(inboxRes.body.success === true, 'Response payload has success=true');
  assert(Array.isArray(inboxRes.body.data) && inboxRes.body.data.length >= 3, `Returns all 3 seeded leads (count: ${inboxRes.body.data.length})`);

  const hardik = inboxRes.body.data.find((l) => l.name === 'Hardik Patel');
  const nidhi = inboxRes.body.data.find((l) => l.name === 'Nidhi Shah');
  const kavita = inboxRes.body.data.find((l) => l.name === 'Kavita Joshi');

  assert(Boolean(hardik), 'Hardik Patel exists in inbox data');
  assert(hardik.source_tag === 'Portal', `Hardik Patel source tag is "Portal" (source: "${hardik.source}")`);
  assert(hardik.status_category === 'Hot', `Hardik Patel status category is "Hot" (status: "${hardik.status}")`);
  assert(hardik.preferred_bhk === '3 BHK', `Hardik Patel preferred BHK is "3 BHK"`);
  assert(hardik.budget === '₹1.25 Cr - 1.50 Cr', `Hardik Patel budget is "${hardik.budget}"`);
  assert(hardik.slot_date_time !== null, `Hardik Patel has booked visit slot datetime: ${hardik.slot_date_time}`);

  assert(Boolean(nidhi), 'Nidhi Shah exists in inbox data');
  assert(nidhi.source_tag === 'Ads', `Nidhi Shah source tag is "Ads" (source: "${nidhi.source}")`);
  assert(nidhi.status_category === 'Cold', `Nidhi Shah status category is "Cold" (status: "${nidhi.status}")`);
  assert(nidhi.preferred_bhk === '2 BHK', `Nidhi Shah preferred BHK is "2 BHK"`);

  assert(Boolean(kavita), 'Kavita Joshi exists in inbox data');
  assert(kavita.source_tag === 'Hoarding', `Kavita Joshi source tag is "Hoarding" (source: "${kavita.source}")`);
  assert(kavita.status_category === 'Visited', `Kavita Joshi status category is "Visited" (status: "${kavita.status}")`);

  // Test 3: GET /api/inbox/leads/:id/transcript
  console.log('\n--- 3. GET /api/inbox/leads/:id/transcript ---');
  const hardikTranscriptRes = await dispatch(app, 'GET', `/api/inbox/leads/${hardik.id}/transcript`);
  assert(hardikTranscriptRes.statusCode === 200, `GET transcript for Hardik Patel (ID: ${hardik.id}) returns 200 OK`);
  assert(hardikTranscriptRes.body.data.length >= 2, `Transcript has ${hardikTranscriptRes.body.data.length} messages`);

  const hasPromotionalRera = hardikTranscriptRes.body.data.some((m) => m.is_promotional && m.rera_number);
  assert(hasPromotionalRera, 'Transcript contains promotional assistant message with mandatory RERA registration number');

  // Test 4: POST /api/inbox/leads/:id/takeover (Take Over)
  console.log('\n--- 4. POST /api/inbox/leads/:id/takeover (Executive Take Over) ---');
  const takeoverRes = await dispatch(app, 'POST', `/api/inbox/leads/${hardik.id}/takeover`, {
    action: 'takeover',
    executiveName: 'Aditya Birla (Senior Residential Advisor)',
  });
  assert(takeoverRes.statusCode === 200, 'Takeover request returned 200 OK');
  assert(takeoverRes.body.data.is_taken_over === true, 'Response confirms is_taken_over = true');
  assert(takeoverRes.body.data.executive_name === 'Aditya Birla (Senior Residential Advisor)', 'Executive name stored correctly');

  // Verify updated status in transcript
  const postTakeoverTranscript = await dispatch(app, 'GET', `/api/inbox/leads/${hardik.id}/transcript`);
  const systemNotice = postTakeoverTranscript.body.data.find(
    (m) => m.text.includes('[SYSTEM NOTICE]') && m.text.includes('Senior Residential Advisor')
  );
  assert(Boolean(systemNotice), 'System notice message injected into transcript upon takeover');

  // Test 5: POST /api/inbox/leads/:id/message (Executive Message)
  console.log('\n--- 5. POST /api/inbox/leads/:id/message (Send Message) ---');
  const execMsgRes = await dispatch(app, 'POST', `/api/inbox/leads/${hardik.id}/message`, {
    text: 'Good afternoon Hardik, I have personally reserved your 3 BHK corner layout viewing for Sunday.',
    executiveName: 'Aditya Birla (Senior Residential Advisor)',
  });
  assert(execMsgRes.statusCode === 201, 'Executive message returned 201 Created');
  assert(execMsgRes.body.data.sender === 'executive', 'Message sender is "executive"');
  assert(execMsgRes.body.data.text.includes('reserved your 3 BHK'), 'Message content saved correctly');

  // Test 6: POST /api/inbox/leads/:id/takeover (Release back to AI)
  console.log('\n--- 6. POST /api/inbox/leads/:id/takeover (Release Control) ---');
  const releaseRes = await dispatch(app, 'POST', `/api/inbox/leads/${hardik.id}/takeover`, {
    action: 'release',
  });
  assert(releaseRes.statusCode === 200, 'Release request returned 200 OK');
  assert(releaseRes.body.data.is_taken_over === false, 'Response confirms is_taken_over = false');

  const finalTranscript = await dispatch(app, 'GET', `/api/inbox/leads/${hardik.id}/transcript`);
  const releaseNotice = finalTranscript.body.data.find(
    (m) => m.text.includes('[SYSTEM NOTICE]') && m.text.includes('AI Assistant resumed')
  );
  assert(Boolean(releaseNotice), 'Release notice injected into transcript upon returning control to AI');

  console.log('\n====================================================');
  console.log('🏁 Unified Lead Inbox Test Summary: ALL ASSERTIONS PASSED!');
  console.log('====================================================\n');
}

testInbox().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

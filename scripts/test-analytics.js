const { app } = require('../server/index');
const db = require('../db');
const analyticsService = require('../server/services/analyticsService');

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

async function testAnalytics() {
  console.log('====================================================');
  console.log('📊 Testing Sales Head Performance Analytics Engine');
  console.log('   1. Median First Response Time (Target < 5 mins)');
  console.log('   2. Percentage of Leads Not Reached in 48 Hours');
  console.log('   3. Lead-to-Visit Conversion Rate');
  console.log('   4. Cost-per-Visit Segmented by Source (₹1,000/lead)');
  console.log('====================================================\n');

  await db.initDb();
  await db.seedDb();

  // Test 1: Service level computation
  console.log('--- 1. Analytics Service Calculation Verification ---');
  const metrics = await analyticsService.getPerformanceMetrics();
  assert(metrics.success === true, 'Performance metrics returned with success=true');
  assert(metrics.summary.cost_per_lead_assumption === 1000, 'Constraint: ₹1,000 cost per lead assumption verified');
  assert(metrics.summary.total_leads >= 3, `Total leads count >= 3 (actual: ${metrics.summary.total_leads})`);

  // Metric 1: Median First Response Time (< 5 mins target)
  console.log('\n--- 2. Metric 1: Median First Response Time ---');
  const medianData = metrics.metrics.median_first_response_time;
  console.log(`   Observed Median: ${medianData.formatted} (Target: ${medianData.target_formatted})`);
  assert(typeof medianData.value_minutes === 'number', 'Median value is a valid numeric minutes value');
  assert(medianData.value_minutes < 5.0, `Median first response time (${medianData.value_minutes}m) meets < 5 mins target`);
  assert(medianData.is_target_met === true, 'is_target_met flag is true');

  // Metric 2: Percentage of leads not reached in 48 hours
  console.log('\n--- 3. Metric 2: Unreached in 48 Hours SLA ---');
  const unreachedData = metrics.metrics.unreached_in_48h;
  console.log(`   Unreached in 48h: ${unreachedData.formatted} (${unreachedData.unreached_count}/${unreachedData.total_leads} leads)`);
  assert(typeof unreachedData.percentage === 'number', 'Unreached percentage is a numeric value');
  assert(unreachedData.unreached_count <= unreachedData.total_leads, 'Unreached count is bounded by total leads');

  // Metric 3: Lead-to-visit conversion rate
  console.log('\n--- 4. Metric 3: Lead-to-Visit Conversion Rate ---');
  const conversionData = metrics.metrics.lead_to_visit_conversion;
  console.log(`   Conversion Rate: ${conversionData.formatted} (${conversionData.visits_count}/${conversionData.total_leads} visits)`);
  assert(conversionData.visits_count >= 2, 'At least 2 mock leads (Hardik Patel booked, Kavita Joshi visited) converted to visits');
  assert(conversionData.rate_percentage >= 50.0, `Conversion rate >= 50% (actual: ${conversionData.rate_percentage}%)`);

  // Metric 4: Cost-per-visit segmented by source (assuming ₹1000/lead)
  console.log('\n--- 5. Metric 4: Cost-per-Visit Segmented by Source (₹1,000/lead) ---');
  const segmented = metrics.metrics.cost_per_visit_segmented;
  assert(Array.isArray(segmented) && segmented.length === 4, 'Includes all 4 source channels: Portal, Ads, Hoarding, Direct');

  const portal = segmented.find((s) => s.source === 'Portal');
  const ads = segmented.find((s) => s.source === 'Ads');
  const hoarding = segmented.find((s) => s.source === 'Hoarding');

  // Portal: Hardik Patel (1 lead -> spend ₹1,000, 1 visit -> CPV ₹1,000)
  assert(portal.lead_count >= 1, `Portal has ${portal.lead_count} lead(s)`);
  assert(portal.total_spend === portal.lead_count * 1000, `Portal spend = ₹${portal.total_spend} (exact ₹1,000 per lead)`);
  assert(portal.visits_count >= 1, `Portal has ${portal.visits_count} booked visit(s)`);
  assert(portal.cost_per_visit === Math.round(portal.total_spend / portal.visits_count), `Portal CPV = ₹${portal.cost_per_visit}`);

  // Ads: Nidhi Shah (1 lead -> spend ₹1,000, 0 visits -> CPV null/N/A)
  assert(ads.lead_count >= 1, `Ads has ${ads.lead_count} lead(s)`);
  assert(ads.total_spend === ads.lead_count * 1000, `Ads spend = ₹${ads.total_spend}`);
  if (ads.visits_count === 0) {
    assert(ads.cost_per_visit === null, 'Ads with 0 visits yields null CPV');
  }

  // Hoarding: Kavita Joshi (1 lead -> spend ₹1,000, 1 visit -> CPV ₹1,000)
  assert(hoarding.lead_count >= 1, `Hoarding has ${hoarding.lead_count} lead(s)`);
  assert(hoarding.total_spend === hoarding.lead_count * 1000, `Hoarding spend = ₹${hoarding.total_spend}`);
  assert(hoarding.visits_count >= 1, `Hoarding has ${hoarding.visits_count} visited lead(s)`);
  assert(hoarding.cost_per_visit === Math.round(hoarding.total_spend / hoarding.visits_count), `Hoarding CPV = ₹${hoarding.cost_per_visit}`);

  // Blended CPV
  assert(metrics.metrics.blended_cost_per_visit.value > 0, `Blended CPV calculated: ₹${metrics.metrics.blended_cost_per_visit.value}`);

  // Test 6: GET /api/analytics/performance Express Route
  console.log('\n--- 6. Express API Endpoint Verification ---');
  const apiRes = await dispatch(app, 'GET', '/api/analytics/performance');
  assert(apiRes.statusCode === 200, 'GET /api/analytics/performance returns 200 OK');
  assert(apiRes.body.metrics.median_first_response_time.value_minutes < 5, 'API response preserves median < 5 target');
  assert(apiRes.body.metrics.cost_per_visit_segmented.length === 4, 'API response returns 4 segmented source channels');

  console.log('\n====================================================');
  console.log('🏁 Sales Head Performance Analytics Tests: 100% PASSED!');
  console.log('====================================================\n');
}

testAnalytics().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

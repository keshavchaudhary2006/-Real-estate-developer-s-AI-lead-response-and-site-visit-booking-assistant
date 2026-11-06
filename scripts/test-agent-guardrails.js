const assert = require('assert');
const agentService = require('../server/services/agentService');
const db = require('../db');

const REQUIRED_HANDOFF_PHRASE =
  'A sales executive will confirm this detail for you. Would you like to schedule a site visit in the meantime?';

async function testAgentGuardrails() {
  console.log('====================================================');
  console.log('🤖 Testing AI Agent Guardrails & Tool Calling');
  console.log('   - FactSheet Adherence Only');
  console.log('   - Final Price / Discount Handoff');
  console.log('   - Unknown Query Handoff');
  console.log('   - Goal Extraction (BHK + Budget -> check_availability)');
  console.log('====================================================\n');

  await db.initDb();
  await db.seedDb();

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  // 1. FactSheet Compliant Query
  await test('1. FactSheet Only: Legitimate FactSheet question succeeds without handoff', async () => {
    const res = await agentService.runAgentTurn({
      message: 'What are the amenities and pricing for Project 1?',
      state: {},
      lang: 'en',
    });

    assert.strictEqual(res.isHandoff, false, 'Should not trigger human handoff');
    const toolCall = res.toolCalls.find((t) => t.tool === 'get_factsheet_data');
    assert(toolCall, 'Should call get_factsheet_data tool');
    assert(res.reply.includes('1.25 Cr'), 'Must include pricing from FactSheet');
    assert(res.reply.includes('PRM/KA/RERA'), 'Must append mandatory RERA');
  });

  // 2. Guardrail: Question NOT in FactSheet (Elevator Brand)
  await test('2. Guardrail Unknown Fact: Question not in FactSheet triggers human_handoff', async () => {
    const res = await agentService.runAgentTurn({
      message: 'What brand of elevator is used in the building?',
      state: {},
      lang: 'en',
    });

    assert.strictEqual(res.isHandoff, true, 'Must flag isHandoff: true');
    const handoffTool = res.toolCalls.find((t) => t.tool === 'human_handoff');
    assert(handoffTool, 'Must execute human_handoff tool');
    assert.strictEqual(handoffTool.args.reason, 'unknown_factsheet_query');
    assert(
      res.reply.includes(REQUIRED_HANDOFF_PHRASE),
      `Reply must contain exact required phrase: "${REQUIRED_HANDOFF_PHRASE}"`
    );
  });

  // 3. Guardrail: Question NOT in FactSheet (Maintenance Fee)
  await test('3. Guardrail Unknown Fact: Maintenance fee inquiry triggers human_handoff', async () => {
    const res = await agentService.runAgentTurn({
      message: 'What are the monthly maintenance charges per square foot?',
      state: {},
      lang: 'en',
    });

    assert.strictEqual(res.isHandoff, true, 'Must trigger handoff for unlisted maintenance fee');
    assert(res.reply.includes(REQUIRED_HANDOFF_PHRASE), 'Must return exact handoff phrase');
  });

  // 4. Guardrail: Final Price / Discount Request
  await test('4. Guardrail Pricing: Discount request triggers human_handoff', async () => {
    const res = await agentService.runAgentTurn({
      message: 'Can I get a 10% discount if I pay upfront?',
      state: {},
      lang: 'en',
    });

    assert.strictEqual(res.isHandoff, true, 'Must trigger handoff for discount request');
    const handoffTool = res.toolCalls.find((t) => t.tool === 'human_handoff');
    assert(handoffTool, 'Must execute human_handoff tool');
    assert.strictEqual(handoffTool.args.reason, 'final_price_or_discount_request');
    assert(
      res.reply.includes(REQUIRED_HANDOFF_PHRASE),
      `Reply must contain exact required phrase: "${REQUIRED_HANDOFF_PHRASE}"`
    );
  });

  // 5. Guardrail: Final Price Negotiation Request
  await test('5. Guardrail Pricing: Final price negotiation inquiry triggers human_handoff', async () => {
    const res = await agentService.runAgentTurn({
      message: 'What is your best final price? Is the price negotiable?',
      state: {},
      lang: 'en',
    });

    assert.strictEqual(res.isHandoff, true, 'Must trigger handoff for final price / negotiation query');
    assert(res.reply.includes(REQUIRED_HANDOFF_PHRASE));
  });

  // 6. Goal Extraction: Both BHK and Budget provided in single message
  await test('6. Goal Extraction (Single Turn): Triggers check_availability tool', async () => {
    const res = await agentService.runAgentTurn({
      message: 'I am looking for a 3 BHK residence and my budget is 1.5 Cr',
      state: {},
      lang: 'en',
    });

    assert.strictEqual(res.state.preferred_bhk, '3 BHK', 'Extracted BHK must be 3 BHK');
    assert.strictEqual(res.state.budget, '₹1.5 Cr', 'Extracted budget must be ₹1.5 Cr');
    assert.strictEqual(res.isHandoff, false, 'Should not trigger handoff');

    const availTool = res.toolCalls.find((t) => t.tool === 'check_availability');
    assert(availTool, 'Must trigger check_availability tool');
    assert.strictEqual(availTool.args.preferred_bhk, '3 BHK');
    assert.strictEqual(availTool.args.budget, '₹1.5 Cr');
    assert(res.reply.includes('Availability Confirmed'), 'Response confirms availability');
    assert(res.reply.includes('PRM/KA/RERA'), 'Must append mandatory RERA');
  });

  // 7. Goal Extraction: Multi-turn conversational extraction
  await test('7. Goal Extraction (Multi-Turn): Prompts for missing budget, then triggers check_availability', async () => {
    // Turn 1: User provides only BHK
    const turn1 = await agentService.runAgentTurn({
      message: 'I want to buy a 2 BHK home',
      state: {},
      lang: 'en',
    });

    assert.strictEqual(turn1.state.preferred_bhk, '2 BHK');
    assert.strictEqual(turn1.state.budget, null);
    const availTool1 = turn1.toolCalls.find((t) => t.tool === 'check_availability');
    assert(!availTool1, 'Should NOT trigger check_availability until budget is also extracted');
    assert(turn1.reply.toLowerCase().includes('budget'), 'Must prompt user for their budget');

    // Turn 2: User provides budget
    const turn2 = await agentService.runAgentTurn({
      message: 'My budget is around 80 Lakhs',
      state: turn1.state, // Pass conversational state from Turn 1
      lang: 'en',
    });

    assert.strictEqual(turn2.state.preferred_bhk, '2 BHK');
    assert.strictEqual(turn2.state.budget, '₹80 Lakhs');

    const availTool2 = turn2.toolCalls.find((t) => t.tool === 'check_availability');
    assert(availTool2, 'Must trigger check_availability tool now that both BHK and budget are known');
    assert.strictEqual(availTool2.args.preferred_bhk, '2 BHK');
    assert.strictEqual(availTool2.args.budget, '₹80 Lakhs');
    assert(turn2.reply.includes('Project 2'), 'Must match Project 2 for 2 BHK');
  });

  // 8. Handoff event logging verification
  await test('8. Handoff Logging: Verifies handoff log entries contain audit details', async () => {
    assert(agentService.handoffLog.length >= 4, 'Handoff events must be recorded in log');
    const lastEvent = agentService.handoffLog[agentService.handoffLog.length - 1];
    assert(lastEvent.id.startsWith('handoff-'), 'Handoff event must have unique ID');
    assert(lastEvent.timestamp, 'Must have timestamp');
    assert(lastEvent.reason, 'Must have reason');
  });

  console.log('\n====================================================');
  console.log(`🏁 Agent Guardrails Test Summary: ${passed}/${total} passed successfully.`);
  console.log('====================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testAgentGuardrails();

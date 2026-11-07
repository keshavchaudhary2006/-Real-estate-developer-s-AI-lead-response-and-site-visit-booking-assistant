import { NextResponse } from 'next/server';
const reminderCron = require('../../../../server/jobs/reminderCron');

export async function GET() {
  const logs = reminderCron.getLogs();
  return NextResponse.json({ success: true, count: logs.length, data: logs });
}

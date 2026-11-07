import { NextRequest, NextResponse } from 'next/server';
const reminderCron = require('../../../../server/jobs/reminderCron');
const db = require('../../../../db');

export async function POST(req: NextRequest) {
  try {
    await db.initDb();
    const body = await req.json().catch(() => ({}));
    const result = await reminderCron.checkAndDispatchReminders(body.mockNow || null);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

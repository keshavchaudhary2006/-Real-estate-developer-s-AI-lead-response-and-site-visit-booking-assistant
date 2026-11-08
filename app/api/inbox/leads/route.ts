import { NextRequest, NextResponse } from 'next/server';
const inboxService = require('../../../../server/services/inboxService');
const db = require('../../../../db');

export async function GET(req: NextRequest) {
  try {
    await db.initDb();
    const leads = await inboxService.getInboxLeads();
    return NextResponse.json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

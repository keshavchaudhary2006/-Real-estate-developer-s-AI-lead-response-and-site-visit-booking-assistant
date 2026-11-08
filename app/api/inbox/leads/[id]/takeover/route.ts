import { NextRequest, NextResponse } from 'next/server';
const inboxService = require('../../../../../../server/services/inboxService');
const db = require('../../../../../../db');

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.initDb();
    const leadId = params.id;
    const body = await req.json();
    const { action, executiveName } = body || {};

    let result;
    if (action === 'release') {
      result = await inboxService.releaseChat(leadId);
    } else {
      result = await inboxService.takeOverChat(leadId, executiveName || 'Sales Executive');
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
const inboxService = require('../../../../../../server/services/inboxService');
const db = require('../../../../../../db');

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.initDb();
    const leadId = params.id;
    const transcript = await inboxService.getLeadTranscript(leadId);
    return NextResponse.json({
      success: true,
      lead_id: parseInt(leadId, 10),
      count: transcript.length,
      data: transcript,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

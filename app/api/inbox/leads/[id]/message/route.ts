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
    const { text, executiveName } = body || {};

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message text is required.' },
        { status: 400 }
      );
    }

    const message = await inboxService.sendExecutiveMessage(leadId, {
      text,
      executiveName: executiveName || 'Sales Executive',
    });

    return NextResponse.json(
      {
        success: true,
        data: message,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

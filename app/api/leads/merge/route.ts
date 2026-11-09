import { NextRequest, NextResponse } from 'next/server';
const leadService = require('../../../../server/services/leadService');
const db = require('../../../../db');

export async function POST(req: NextRequest) {
  try {
    await db.initDb();
    const { primaryLeadId, duplicateLeadId } = await req.json();
    if (!primaryLeadId || !duplicateLeadId) {
      return NextResponse.json(
        { success: false, error: 'Both primaryLeadId and duplicateLeadId are required.' },
        { status: 400 }
      );
    }
    const result = await leadService.mergeLeads(primaryLeadId, duplicateLeadId);
    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.primaryLead,
      deletedLeadId: result.deletedLeadId,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

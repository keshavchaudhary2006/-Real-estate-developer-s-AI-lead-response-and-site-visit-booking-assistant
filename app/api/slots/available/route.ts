import { NextRequest, NextResponse } from 'next/server';
const slotsService = require('../../../../server/services/slotsService');
const db = require('../../../../db');

export async function GET(req: NextRequest) {
  try {
    await db.initDb();
    const { searchParams } = new URL(req.url);
    const filters = {
      project_id: searchParams.get('project_id') || undefined,
    };
    const slots = await slotsService.getAvailableSlots(filters);
    return NextResponse.json({ success: true, count: slots.length, data: slots });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

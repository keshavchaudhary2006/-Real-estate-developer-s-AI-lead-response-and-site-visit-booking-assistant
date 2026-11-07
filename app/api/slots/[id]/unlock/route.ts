import { NextRequest, NextResponse } from 'next/server';
const slotsService = require('../../../../../server/services/slotsService');
const db = require('../../../../../db');

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.initDb();
    const released = await slotsService.releaseLock(params.id);
    return NextResponse.json({ success: true, message: 'Lock released.', data: released });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

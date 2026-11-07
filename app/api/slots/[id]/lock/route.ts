import { NextRequest, NextResponse } from 'next/server';
const slotsService = require('../../../../../server/services/slotsService');
const db = require('../../../../../db');

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.initDb();
    const body = await req.json().catch(() => ({}));
    // CRITICAL CONSTRAINT: defaults to 2 minutes temporary lock
    const duration = body.durationMinutes ? parseInt(body.durationMinutes, 10) : 2;
    const locked = await slotsService.lockSlot(params.id, duration);
    return NextResponse.json(locked);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 409 });
  }
}

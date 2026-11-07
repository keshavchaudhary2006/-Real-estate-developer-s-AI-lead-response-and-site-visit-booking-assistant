import { NextRequest, NextResponse } from 'next/server';
const slotsService = require('../../../../../server/services/slotsService');
const db = require('../../../../../db');

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.initDb();
    const body = await req.json().catch(() => ({}));
    const result = await slotsService.confirmBooking(params.id, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

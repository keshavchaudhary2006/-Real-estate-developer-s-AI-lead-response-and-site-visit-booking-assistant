import { NextRequest, NextResponse } from 'next/server';
const slotsService = require('../../../server/services/slotsService');
const db = require('../../../db');

export async function GET(req: NextRequest) {
  try {
    await db.initDb();
    const { searchParams } = new URL(req.url);
    const filters = {
      project_id: searchParams.get('project_id') || undefined,
      is_booked: searchParams.get('is_booked') || undefined,
    };
    const slots = await slotsService.getAllSlots(filters);
    return NextResponse.json({ success: true, count: slots.length, data: slots });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await db.initDb();
    const body = await req.json();
    const slot = await slotsService.createSlot(body);
    return NextResponse.json({ success: true, message: 'Visit slot created successfully.', data: slot }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

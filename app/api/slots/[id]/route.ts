import { NextRequest, NextResponse } from 'next/server';
const slotsService = require('../../../../server/services/slotsService');
const db = require('../../../../db');

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.initDb();
    const slot = await slotsService.getSlotById(params.id);
    if (!slot) {
      return NextResponse.json({ success: false, error: 'VisitSlot not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: slot });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.initDb();
    const body = await req.json();
    const updated = await slotsService.updateSlot(params.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'VisitSlot not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'VisitSlot updated successfully.', data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.initDb();
    const success = await slotsService.deleteSlot(params.id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'VisitSlot not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `VisitSlot #${params.id} deleted successfully.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

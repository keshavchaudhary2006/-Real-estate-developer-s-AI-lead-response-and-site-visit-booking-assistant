import { NextRequest, NextResponse } from 'next/server';
const factSheetService = require('../../../../server/services/factSheetService');
const db = require('../../../../db');

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.initDb();
    const item = await factSheetService.getFactSheetById(params.id);
    if (!item) {
      return NextResponse.json({ success: false, error: 'FactSheet not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.initDb();
    const body = await req.json();
    const updated = await factSheetService.updateFactSheet(params.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'FactSheet not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'FactSheet updated successfully.', data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.initDb();
    const success = await factSheetService.deleteFactSheet(params.id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'FactSheet not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `FactSheet for project "${params.id}" deleted successfully.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
const factSheetService = require('../../../server/services/factSheetService');
const db = require('../../../db');

export async function GET() {
  try {
    await db.initDb();
    const data = await factSheetService.getAllFactSheets();
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await db.initDb();
    const body = await req.json();
    const item = await factSheetService.createFactSheet(body);
    return NextResponse.json({ success: true, message: 'FactSheet created successfully.', data: item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

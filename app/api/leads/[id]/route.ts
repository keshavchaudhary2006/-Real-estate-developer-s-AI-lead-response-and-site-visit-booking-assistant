import { NextRequest, NextResponse } from 'next/server';
const leadService = require('../../../../server/services/leadService');
const db = require('../../../../db');

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.initDb();
    const lead = await leadService.getLeadById(params.id);
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: lead });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.initDb();
    const body = await req.json();
    const updated = await leadService.updateLead(params.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Lead updated successfully.', data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return PUT(req, { params });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.initDb();
    const success = await leadService.deleteLead(params.id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Lead #${params.id} deleted successfully.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

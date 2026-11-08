import { NextRequest, NextResponse } from 'next/server';
const leadService = require('../../../server/services/leadService');
const db = require('../../../db');

export async function GET(req: NextRequest) {
  try {
    await db.initDb();
    const { searchParams } = new URL(req.url);
    const filters = {
      status: searchParams.get('status') || undefined,
      preferred_bhk: searchParams.get('preferred_bhk') || undefined,
      search: searchParams.get('search') || undefined,
    };
    const leads = await leadService.getAllLeads(filters);
    return NextResponse.json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await db.initDb();
    const body = await req.json();
    const result = await leadService.createOrMergeLead(body);
    const statusCode = result.merged ? 200 : 201;
    return NextResponse.json(
      {
        success: true,
        merged: result.merged,
        message: result.message,
        data: result.lead,
        previousData: result.previousData,
      },
      { status: statusCode }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

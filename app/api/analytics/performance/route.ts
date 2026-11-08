import { NextRequest, NextResponse } from 'next/server';
const analyticsService = require('../../../../server/services/analyticsService');
const db = require('../../../../db');

export async function GET(req: NextRequest) {
  try {
    await db.initDb();
    const { searchParams } = new URL(req.url);
    const mockNow = searchParams.get('mockNow');
    const metrics = await analyticsService.getPerformanceMetrics(mockNow);
    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

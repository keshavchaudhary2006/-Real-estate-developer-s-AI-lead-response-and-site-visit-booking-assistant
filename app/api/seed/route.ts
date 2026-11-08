import { NextResponse } from 'next/server';
const db = require('../../../db');

export async function POST() {
  try {
    const res = await db.seedDb();
    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully with mock data.',
      result: res,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

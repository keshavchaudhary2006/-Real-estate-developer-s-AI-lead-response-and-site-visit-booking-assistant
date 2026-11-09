import { NextResponse } from 'next/server';
const db = require('../../../db');

export async function GET() {
  await db.initDb();
  return NextResponse.json({
    status: 'online',
    appName: 'Keshav',
    dbMode: db.getMode(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}

import { NextRequest, NextResponse } from 'next/server';
const chatService = require('../../../server/services/chatService');
const db = require('../../../db');

export async function POST(req: NextRequest) {
  try {
    await db.initDb();
    const body = await req.json();
    const { message, state, lang, hasConsented } = body;

    const response = await chatService.processChatMessage({
      message,
      state: state || {},
      lang: lang || 'en',
      hasConsented: Boolean(hasConsented),
    });

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

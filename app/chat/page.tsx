'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ArrowUp,
  Check,
  Building,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  Sparkles,
  Phone,
  AlertCircle,
  Clock,
  UserCheck,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import SiteVisitScheduler from './SiteVisitScheduler';

type Language = 'en' | 'hi' | 'gu';

interface ToolCall {
  tool: string;
  args: any;
  result?: any;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  isPromotional?: boolean;
  projectId?: string;
  reraNumber?: string;
  isHandoff?: boolean;
  availabilityChecked?: boolean;
  toolCalls?: ToolCall[];
  timestamp: string;
}

const DICTIONARY = {
  en: {
    brand: 'KESHAV',
    subBrand: 'PRIVATE RESIDENCES & ADVISORY',
    status: 'AI Advisory Desk',
    dpdpBadge: 'DPDP Act, 2023 Compliant',
    dpdpTitle: 'Personal Data Processing Notice',
    dpdpBody:
      'Pursuant to the Digital Personal Data Protection (DPDP) Act, 2023, we seek your explicit consent to process your contact number strictly for verified residential fact sheets and private site visits. Your data will never be commercialized.',
    dpdpOptOutHint: 'You may withdraw consent at any time by typing "STOP" in this chat.',
    consentBtn: 'I Consent & Proceed',
    optOutBtn: 'Opt Out (STOP)',
    consentedStatus: 'DPDP Consent Active',
    optedOutStatus: 'Marketing Consent Withdrawn',
    placeholder: 'Ask about residences, pricing, or type STOP...',
    initialGreeting:
      'Welcome to Keshav Private Advisory. We represent two landmark architectural projects in Karnataka:\n\n• Project 1: Keshav Sky Villas (3 & 4 BHK Ultra-Luxury)\n• Project 2: Keshav Urban Heights (2 & 3 BHK Contemporary)\n\nHow may we guide your residence acquisition today?',
    quickPrompts: [
      'View Project 1 (Sky Villas)',
      'View Project 2 (Urban Heights)',
      'I want a 3 BHK under 1.5 Cr',
      'Can I get a 10% discount?',
      'STOP (Opt Out)',
    ],
    reraDisclaimer: 'Mandatory RERA Registration',
    viewDashboard: 'Admin CRM',
  },
  hi: {
    brand: 'KESHAV',
    subBrand: 'प्राइवेट रेजिडेंस एवं परामर्श',
    status: 'AI एडवाइजरी डेस्क',
    dpdpBadge: 'DPDP अधिनियम, 2023 अनुपालन',
    dpdpTitle: 'व्यक्तिगत डेटा प्रसंस्करण सूचना',
    dpdpBody:
      'डिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) अधिनियम, 2023 के अंतर्गत, केवल सत्यापित प्रोजेक्ट विवरण व साइट विज़िट समन्वय हेतु आपका संपर्क नंबर प्रोसेस करने के लिए आपकी सहमति आवश्यक है। आपका डेटा पूर्णतः सुरक्षित रहेगा।',
    dpdpOptOutHint: 'सहमति कभी भी वापस लेने हेतु इस चैट में "STOP" लिखें।',
    consentBtn: 'सहमति दें एवं आगे बढ़ें',
    optOutBtn: 'ऑप्ट आउट (STOP)',
    consentedStatus: 'DPDP सहमति सक्रिय',
    optedOutStatus: 'मार्केटिंग सहमति निरस्त',
    placeholder: 'प्रोजेक्ट, मूल्य पूछें या STOP लिखें...',
    initialGreeting:
      'केशव प्राइवेट एडवाइजरी में आपका स्वागत है। हमारे पास दो प्रमुख प्रोजेक्ट्स उपलब्ध हैं:\n\n• प्रोजेक्ट 1: केशव स्काई विला (3 व 4 BHK लक्ज़री)\n• प्रोजेक्ट 2: केशव अर्बन हाइट्स (2 व 3 BHK स्मार्ट होम्स)\n\nआज हम आपके गृह चयन में किस प्रकार सहायता कर सकते हैं?',
    quickPrompts: [
      'प्रोजेक्ट 1 (स्काई विला) देखें',
      'प्रोजेक्ट 2 (अर्बन हाइट्स) देखें',
      'मुझे 1.5 करोड़ में 3 BHK चाहिए',
      'क्या कोई डिस्काउंट मिल सकता है?',
      'STOP (ऑप्ट आउट)',
    ],
    reraDisclaimer: 'अनिवार्य RERA पंजीकरण',
    viewDashboard: 'एडमिन CRM',
  },
  gu: {
    brand: 'KESHAV',
    subBrand: 'પ્રાઇવેટ રેસિડેન્સ અને સલાહકાર',
    status: 'AI સલાહકાર ડેસ્ક',
    dpdpBadge: 'DPDP એક્ટ, 2023 સુસંગત',
    dpdpTitle: 'વ્યક્તિગત ડેટા પ્રક્રિયા સૂચના',
    dpdpBody:
      'ડિજિટલ પર્સનલ ડેટા પ્રોટેક્શન (DPDP) એક્ટ, 2023 હેઠળ, અધિકૃત પ્રોજેક્ટ વિગતો અને સાઇટ મુલાકાત માટે તમારો સંપર્ક નંબર પ્રોસેસ કરવા તમારી સંમતિ જરૂરી છે. તમારો ડેટા ક્યારેય વહેંચવામાં આવશે નહીં.',
    dpdpOptOutHint: 'સંમતિ પાછી ખેંચવા માટે આ ચેટમાં કોઈપણ સમયે "STOP" લખો.',
    consentBtn: 'સંમતિ આપો અને આગળ વધો',
    optOutBtn: 'ઑપ્ટ આઉટ (STOP)',
    consentedStatus: 'DPDP સંમતિ સક્રિય',
    optedOutStatus: 'માર્કેટિંગ સંમતિ રદ કરી',
    placeholder: 'પ્રોજેક્ટ, કિંમત પૂછો અથવા STOP લખો...',
    initialGreeting:
      'કેશવ પ્રાઇવેટ એડવાઇઝરીમાં આપનું સ્વાગત છે. અમારી પાસે બે સીમાચિહ્નરૂપ પ્રોજેક્ટ્સ છે:\n\n• પ્રોજેક્ટ 1: કેશવ સ્કાય વિલાસ (3 અને 4 BHK લક્ઝરી)\n• પ્રોજેક્ટ 2: કેશવ અર્બન હાઇટ્સ (2 અને 3 BHK સ્માર્ટ હોમ્સ)\n\nઆજે અમે આપના નવા ઘરની પસંદગીમાં કઈ રીતે સહાયક બની શકીએ?',
    quickPrompts: [
      'પ્રોજેક્ટ 1 (સ્કાય વિલા) જુઓ',
      'પ્રોજેક્ટ 2 (અર્બન હાઇટ્સ) જુઓ',
      'મને 1.5 કરોડમાં 3 BHK જોઈએ છે',
      'શું ડિસ્કાઉન્ટ મળી શકે?',
      'STOP (ઑપ્ટ આઉટ)',
    ],
    reraDisclaimer: 'કાયદેસર RERA નોંધણી',
    viewDashboard: 'એડમિન CRM',
  },
};

export default function MobileChatPage() {
  const [lang, setLang] = useState<Language>('en');
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentState, setAgentState] = useState<{ preferred_bhk?: string; budget?: string; project_id?: string }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = DICTIONARY[lang];

  // Initialize initial greeting
  useEffect(() => {
    const greetingText = t.initialGreeting;
    const initialPromotionalFooter =
      '\n\n──────────────────────────────\n🏛️ ' +
      t.reraDisclaimer +
      ': PRM/KA/RERA/1251/310/PR/210101/004001 & PRM/KA/RERA/1251/308/PR/210215/004050';

    setMessages([
      {
        id: 'msg-init',
        sender: 'assistant',
        text: greetingText + initialPromotionalFooter,
        isPromotional: true,
        projectId: 'Project 1 & 2',
        reraNumber: 'PRM/KA/RERA/1251/310/PR/210101/004001',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [lang]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle Consent
  const handleConsent = () => {
    setHasConsented(true);
    sendMessageDirect('I agree to the DPDP Act terms.');
  };

  // Handle Explicit Opt Out button
  const handleOptOut = () => {
    setHasConsented(false);
    sendMessageDirect('STOP');
  };

  // Send Message logic
  const sendMessageDirect = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          state: agentState,
          lang: lang,
          hasConsented: hasConsented === true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.consentStatus === 'opted_out') {
          setHasConsented(false);
        } else if (data.consentStatus === 'consented') {
          setHasConsented(true);
        }

        if (data.state) {
          setAgentState(data.state);
        }

        const botMsg: Message = {
          id: 'bot-' + Date.now(),
          sender: 'assistant',
          text: data.reply,
          isPromotional: data.isPromotional,
          projectId: data.projectId,
          reraNumber: data.reraNumber,
          isHandoff: data.isHandoff,
          availabilityChecked: data.availabilityChecked,
          toolCalls: data.toolCalls,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errorMsg: Message = {
          id: 'err-' + Date.now(),
          sender: 'assistant',
          text: 'We encountered an error connecting to our advisory desk. Please retry.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageDirect(inputMessage);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] text-[#141416] flex justify-center antialiased font-sans selection:bg-neutral-900 selection:text-white">
      {/* Mobile-First Container (max-w-md on desktop, full width on mobile) */}
      <div className="w-full max-w-md min-h-screen bg-white flex flex-col shadow-2xl relative border-x border-[#EBEBEF]">
        
        {/* PREMIUM MINIMAL HEADER */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EBEBEF] px-5 py-4 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.25em] text-[#111111] uppercase">
                {t.brand}
              </div>
              <div className="text-[9px] tracking-wider text-[#737373] uppercase mt-0.5 font-medium">
                {t.subBrand}
              </div>
            </div>

            {/* Language Switcher Pill */}
            <div className="flex items-center rounded-full bg-[#F4F4F6] p-0.5 border border-[#E5E5E7] text-[11px] font-medium">
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  lang === 'en'
                    ? 'bg-black text-white shadow-sm font-semibold'
                    : 'text-[#666666] hover:text-black'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('hi')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  lang === 'hi'
                    ? 'bg-black text-white shadow-sm font-semibold'
                    : 'text-[#666666] hover:text-black'
                }`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => setLang('gu')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  lang === 'gu'
                    ? 'bg-black text-white shadow-sm font-semibold'
                    : 'text-[#666666] hover:text-black'
                }`}
              >
                ગુજરાતી
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-[#525252]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">{t.status}</span>
            </div>

            {/* Extracted Goals Indicator */}
            {(agentState.preferred_bhk || agentState.budget) && (
              <div className="text-[10px] text-neutral-500 font-mono bg-neutral-100 px-2 py-0.5 rounded-md">
                Goal: {agentState.preferred_bhk || '?'} | {agentState.budget || '?'}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Link
                href="/inbox"
                className="text-[#737373] hover:text-black transition flex items-center gap-1 font-medium text-[10px] border border-neutral-200 px-2 py-0.5 rounded"
                title="Sales Executive Unified Inbox"
              >
                <span>Sales Inbox</span>
              </Link>
              <Link
                href="/"
                className="text-[#737373] hover:text-black transition flex items-center gap-1 font-medium text-[10px]"
              >
                <span>{t.viewDashboard}</span>
                <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
              </Link>
            </div>
          </div>
        </header>

        {/* CHAT STREAM AREA */}
        <main className="flex-1 p-5 overflow-y-auto space-y-6 bg-white">
          
          {/* STATUTORY DPDP ACT COMPLIANCE BANNER */}
          <section className="rounded-2xl border border-[#E5E5E7] bg-[#FAFAFC] p-4 space-y-3.5 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-neutral-800">
                  {t.dpdpBadge}
                </span>
              </div>

              {hasConsented === true ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  {t.consentedStatus}
                </span>
              ) : hasConsented === false ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  {t.optedOutStatus}
                </span>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xs font-semibold text-neutral-900">{t.dpdpTitle}</h2>
              <p className="text-[11px] leading-relaxed text-neutral-600 font-normal">
                {t.dpdpBody}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-[#EAEAEF] text-[10px] text-neutral-700 font-mono flex items-center justify-between">
              <span>{t.dpdpOptOutHint}</span>
              <span className="font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded">STOP</span>
            </div>

            {hasConsented === null && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleConsent}
                  className="flex-1 py-2 px-3 bg-neutral-900 hover:bg-black text-white text-[11px] font-semibold rounded-xl transition shadow-sm"
                >
                  {t.consentBtn}
                </button>
                <button
                  onClick={handleOptOut}
                  className="py-2 px-3 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-[11px] font-medium rounded-xl transition"
                >
                  {t.optOutBtn}
                </button>
              </div>
            )}
          </section>

          {/* DATE SEPARATOR */}
          <div className="flex items-center justify-center my-4">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest px-3 bg-white">
              Guardrailed AI Real Estate Assistant
            </span>
          </div>

          {/* MESSAGES LIST */}
          <div className="space-y-5">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  {/* Tool Call Notification Pill (Subtle Monochromatic Indicator) */}
                  {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mb-1 px-1">
                      {msg.toolCalls.map((tc, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-[9px] font-mono text-neutral-700"
                        >
                          <Zap className="w-2.5 h-2.5 text-neutral-900" />
                          Tool: {tc.tool}()
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`max-w-[88%] rounded-2xl p-4 text-[13px] leading-relaxed transition-all ${
                      isUser
                        ? 'bg-neutral-950 text-white rounded-br-sm shadow-sm'
                        : 'bg-[#F5F5F7] text-neutral-900 border border-[#EBEBEF] rounded-bl-sm shadow-none'
                    }`}
                  >
                    {/* Handoff Notice Banner if triggered */}
                    {msg.isHandoff && (
                      <div className="mb-3 pb-2.5 border-b border-neutral-200 flex items-center gap-1.5 text-[10px] font-semibold text-neutral-800 uppercase tracking-wider font-mono">
                        <UserCheck className="w-3.5 h-3.5 text-neutral-900" />
                        <span>Sales Executive Handoff Triggered</span>
                      </div>
                    )}

                    {/* Availability Checked Banner if triggered */}
                    {msg.availabilityChecked && (
                      <div className="mb-3 pb-2.5 border-b border-neutral-200 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 uppercase tracking-wider font-mono">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Unit & Visit Slot Availability Verified</span>
                      </div>
                    )}

                    <div className="whitespace-pre-line font-normal">{msg.text}</div>

                    {/* MANDATORY RERA REGISTRATION BADGE */}
                    {msg.isPromotional && msg.reraNumber && (
                      <div className="mt-3 pt-3 border-t border-neutral-300/60 text-[10px] text-neutral-600 flex items-center gap-1.5 font-mono">
                        <Building className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                        <span>RERA verified under Karnataka Real Estate Regulatory Authority</span>
                      </div>
                    )}
                  </div>

                  {/* INTERACTIVE CALENDAR UI: Surfaced when AI triggers check_availability */}
                  {!isUser &&
                    (msg.availabilityChecked ||
                      msg.text.includes('Availability Confirmed') ||
                      msg.text.includes('उपलब्धता परिणाम') ||
                      msg.text.includes('Available Site Visit')) && (
                      <div className="w-full max-w-[94%] pt-2 animate-fade-in">
                        <SiteVisitScheduler
                          projectId={msg.projectId}
                          lang={lang}
                          defaultPhone={agentState.budget ? '9876543210' : ''}
                          defaultName="Valued Buyer"
                          onBookingConfirmed={(booking) => {
                            const confMsg: Message = {
                              id: 'conf-' + Date.now(),
                              sender: 'assistant',
                              text: `🎉 **Site Visit Successfully Confirmed!**\n\n• **Slot ID:** #${booking.slotId}\n• **Project:** ${booking.projectId}\n• **Date & Time:** ${new Date(booking.dateTime).toLocaleString()}\n\nOur senior residential advisor looks forward to hosting your private consultation.\n\n──────────────────────────────\n🏛️ Mandatory RERA: ${booking.reraNumber} | Karnataka RERA Registered`,
                              isPromotional: true,
                              projectId: booking.projectId,
                              reraNumber: booking.reraNumber,
                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            };
                            setMessages((prev) => [...prev, confMsg]);
                          }}
                        />
                      </div>
                    )}

                  <span className="text-[9px] text-neutral-400 px-1 font-mono">{msg.timestamp}</span>
                </div>
              );
            })}

            {/* Assistant typing indicator */}
            {loading && (
              <div className="flex items-start space-y-1">
                <div className="bg-[#F5F5F7] border border-[#EBEBEF] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* QUICK PROMPT CHIPS */}
          <div className="pt-2">
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-2">
              Inquire Instantly
            </div>
            <div className="flex flex-wrap gap-1.5">
              {t.quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessageDirect(prompt)}
                  disabled={loading}
                  className="text-[11px] font-medium py-1.5 px-3 rounded-full border border-neutral-300 hover:border-black hover:bg-black hover:text-white text-neutral-700 transition duration-150"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </main>

        {/* BOTTOM FIXED INPUT DOCK */}
        <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#EBEBEF] p-4">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={t.placeholder}
                className="w-full pl-4 pr-10 py-3 bg-[#F4F4F6] border border-[#E5E5E7] rounded-full text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="w-10 h-10 rounded-full bg-neutral-950 hover:bg-black disabled:opacity-40 text-white flex items-center justify-center transition shadow-sm shrink-0"
              title="Send Message"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </form>

          <div className="text-[9px] text-center text-neutral-400 mt-2 font-mono">
            DPDP Act, 2023 Compliant · Reply STOP to Opt Out · Strict FactSheet Guardrails
          </div>
        </footer>
      </div>
    </div>
  );
}

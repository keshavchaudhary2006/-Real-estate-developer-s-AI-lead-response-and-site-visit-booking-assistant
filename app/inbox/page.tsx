'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Inbox,
  User,
  Phone,
  Building,
  Calendar,
  MessageSquare,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Bot,
  UserCheck,
  Send,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

interface InboxLead {
  id: number;
  name: string;
  phone: string;
  source: string;
  source_tag: 'Portal' | 'Ads' | 'Hoarding' | 'Direct';
  preferred_bhk: string;
  budget: string;
  status: string;
  status_category: 'Hot' | 'Visited' | 'Cold';
  created_at: string;
  updated_at: string;
  project_id: string;
  project_pricing: string | null;
  project_rera: string | null;
  slot_id: number | null;
  slot_date_time: string | null;
  is_taken_over: boolean;
  executive_name: string | null;
  latest_message?: {
    text: string;
    sender: string;
    created_at: string;
  } | null;
}

interface TranscriptMessage {
  id: number;
  lead_id: number;
  sender: 'user' | 'assistant' | 'executive';
  text: string;
  tool_calls?: any;
  is_promotional: boolean;
  rera_number?: string | null;
  created_at: string;
}

export default function SalesExecutiveInbox() {
  const [leads, setLeads] = useState<InboxLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(true);
  const [loadingTranscript, setLoadingTranscript] = useState<boolean>(false);
  const [submittingTakeover, setSubmittingTakeover] = useState<boolean>(false);
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);
  const [execMessageInput, setExecMessageInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Hot' | 'Visited' | 'Cold'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'Portal' | 'Ads' | 'Hoarding'>('all');
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);
  const [executiveName, setExecutiveName] = useState<string>('Senior Residential Advisor');
  const [actionNotification, setActionNotification] = useState<string | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Fetch leads on mount
  const fetchLeads = async (preserveSelectedId = true) => {
    try {
      const res = await fetch('/api/inbox/leads');
      if (res.ok) {
        const json = await res.json();
        const leadList: InboxLead[] = json.data || [];
        setLeads(leadList);

        if (leadList.length > 0) {
          if (!preserveSelectedId || selectedLeadId === null) {
            setSelectedLeadId(leadList[0].id);
          } else {
            // verify selected lead still exists
            const stillExists = leadList.some((l) => l.id === selectedLeadId);
            if (!stillExists) {
              setSelectedLeadId(leadList[0].id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch inbox leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  // Fetch transcript when selectedLeadId changes
  const fetchTranscript = async (leadId: number) => {
    setLoadingTranscript(true);
    try {
      const res = await fetch(`/api/inbox/leads/${leadId}/transcript`);
      if (res.ok) {
        const json = await res.json();
        setTranscript(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch transcript:', err);
    } finally {
      setLoadingTranscript(false);
    }
  };

  useEffect(() => {
    fetchLeads(false);
  }, []);

  useEffect(() => {
    if (selectedLeadId !== null) {
      fetchTranscript(selectedLeadId);
    }
  }, [selectedLeadId]);

  // Scroll to bottom of transcript on update
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Active selected lead data
  const selectedLead = leads.find((l) => l.id === selectedLeadId) || null;

  // Handle Takeover toggle
  const handleToggleTakeover = async () => {
    if (!selectedLead) return;
    setSubmittingTakeover(true);

    const action = selectedLead.is_taken_over ? 'release' : 'takeover';

    try {
      const res = await fetch(`/api/inbox/leads/${selectedLead.id}/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          executiveName: executiveName || 'Senior Residential Advisor',
        }),
      });

      if (res.ok) {
        // Update local lead state
        setLeads((prev) =>
          prev.map((l) =>
            l.id === selectedLead.id
              ? {
                  ...l,
                  is_taken_over: action === 'takeover',
                  executive_name: action === 'takeover' ? executiveName : null,
                }
              : l
          )
        );

        // Refresh transcript to show system notification
        await fetchTranscript(selectedLead.id);

        const msg =
          action === 'takeover'
            ? `Takeover activated: You are now in control of Lead #${selectedLead.id}`
            : `Chat released: AI Assistant resumed for Lead #${selectedLead.id}`;
        showToast(msg);
      }
    } catch (err) {
      console.error('Error toggling takeover:', err);
      showToast('Error modifying chat takeover state');
    } finally {
      setSubmittingTakeover(false);
    }
  };

  // Handle sending executive message
  const handleSendExecutiveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !execMessageInput.trim()) return;

    const messageText = execMessageInput.trim();
    setSendingMsg(true);

    try {
      // If not taken over yet, automatically take over first
      if (!selectedLead.is_taken_over) {
        await fetch(`/api/inbox/leads/${selectedLead.id}/takeover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'takeover',
            executiveName: executiveName || 'Senior Residential Advisor',
          }),
        });

        setLeads((prev) =>
          prev.map((l) =>
            l.id === selectedLead.id
              ? { ...l, is_taken_over: true, executive_name: executiveName }
              : l
          )
        );
      }

      const res = await fetch(`/api/inbox/leads/${selectedLead.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: messageText,
          executiveName: executiveName || 'Senior Residential Advisor',
        }),
      });

      if (res.ok) {
        setExecMessageInput('');
        await fetchTranscript(selectedLead.id);
        showToast('Message dispatched directly to client transcript');
      }
    } catch (err) {
      console.error('Failed to send executive message:', err);
      showToast('Failed to deliver message');
    } finally {
      setSendingMsg(false);
    }
  };

  const showToast = (msg: string) => {
    setActionNotification(msg);
    setTimeout(() => setActionNotification(null), 4000);
  };

  const handleCopyPhone = (phoneStr: string) => {
    navigator.clipboard.writeText(phoneStr);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Filtered leads
  const filteredLeads = leads.filter((lead) => {
    if (statusFilter !== 'all' && lead.status_category !== statusFilter) return false;
    if (sourceFilter !== 'all' && lead.source_tag !== sourceFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = lead.name?.toLowerCase().includes(q);
      const matchPhone = lead.phone?.toLowerCase().includes(q);
      const matchBhk = lead.preferred_bhk?.toLowerCase().includes(q);
      const matchBudget = lead.budget?.toLowerCase().includes(q);
      const matchProj = lead.project_id?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchBhk && !matchBudget && !matchProj) return false;
    }
    return true;
  });

  // Format date helper
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Not scheduled';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#18181B] flex flex-col font-sans selection:bg-neutral-900 selection:text-white antialiased">
      {/* Toast Notification */}
      {actionNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 border border-neutral-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotification}</span>
        </div>
      )}

      {/* TOP MINIMALIST NAV BAR */}
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="group flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm group-hover:bg-neutral-800 transition">
                K
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm tracking-tight text-neutral-900">
                    Keshav
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-neutral-200 text-neutral-500 bg-neutral-50">
                    Executive Inbox
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-normal">
                  Unified Lead Pipeline & Autonomous Conversation Takeover
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Quick stats counter */}
            <div className="hidden lg:flex items-center gap-4 text-xs text-neutral-500 border-r border-neutral-200 pr-4 mr-1">
              <div>
                Total Leads: <span className="font-semibold text-neutral-900">{leads.length}</span>
              </div>
              <div>
                Active Takeovers:{' '}
                <span className="font-semibold text-neutral-900">
                  {leads.filter((l) => l.is_taken_over).length}
                </span>
              </div>
            </div>

            {/* Refresh leads */}
            <button
              onClick={() => fetchLeads(true)}
              className="p-2 rounded-md border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
              title="Refresh Pipeline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLeads ? 'animate-spin' : ''}`} />
            </button>

            {/* Link to Admin Editor CMS */}
            <Link
              href="/admin/cms"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
              title="Sales Head FactSheet & Visit Slots CMS"
            >
              <span>Admin CMS</span>
            </Link>

            {/* Link to Performance Dashboard */}
            <Link
              href="/admin/performance"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
              title="Sales Head Performance Analytics Dashboard"
            >
              <span>Performance</span>
            </Link>

            {/* Link to Buyer Chat */}
            <Link
              href="/chat"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
            >
              <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
              <span>Buyer Web Chat</span>
              <ArrowUpRight className="w-3 h-3 text-neutral-400" />
            </Link>

            {/* Link to CRM Dashboard */}
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition shadow-sm"
            >
              <span>Admin CRM</span>
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER: Pipeline List + Split Screen Workspace */}
      <div className="max-w-[1700px] w-full mx-auto flex-1 flex flex-col lg:flex-row overflow-hidden border-b border-neutral-200">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Lead Pipeline List with Source & Subtle Status Tags         */}
        {/* ========================================================================= */}
        <aside className="w-full lg:w-96 xl:w-[420px] bg-white border-r border-neutral-200 flex flex-col shrink-0 min-h-[500px] lg:min-h-[calc(100vh-61px)]">
          {/* Search & Filters */}
          <div className="p-4 border-b border-neutral-200 space-y-3 bg-white sticky top-0 z-10">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search leads, phone, BHK, budget..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-md border border-neutral-200 text-xs bg-[#FAFAF9] placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white transition"
              />
            </div>

            {/* Status Category Filter Tabs with Subtle Accent Color strictly on Status Tags */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1 font-medium scrollbar-none">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded transition whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                All ({leads.length})
              </button>
              <button
                onClick={() => setStatusFilter('Hot')}
                className={`px-2.5 py-1 rounded transition whitespace-nowrap border ${
                  statusFilter === 'Hot'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                    : 'border-transparent text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Hot ({leads.filter((l) => l.status_category === 'Hot').length})
              </button>
              <button
                onClick={() => setStatusFilter('Visited')}
                className={`px-2.5 py-1 rounded transition whitespace-nowrap border ${
                  statusFilter === 'Visited'
                    ? 'bg-sky-50 text-sky-800 border-sky-300 font-semibold'
                    : 'border-transparent text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Visited ({leads.filter((l) => l.status_category === 'Visited').length})
              </button>
              <button
                onClick={() => setStatusFilter('Cold')}
                className={`px-2.5 py-1 rounded transition whitespace-nowrap border ${
                  statusFilter === 'Cold'
                    ? 'bg-stone-100 text-stone-700 border-stone-300 font-semibold'
                    : 'border-transparent text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Cold ({leads.filter((l) => l.status_category === 'Cold').length})
              </button>
            </div>

            {/* Source Tag Filter Chips (Monochromatic) */}
            <div className="flex items-center gap-1 text-[10px] text-neutral-500 overflow-x-auto pt-0.5">
              <span className="font-semibold uppercase tracking-wider text-[9px] mr-1">Source:</span>
              {(['all', 'Portal', 'Ads', 'Hoarding'] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => setSourceFilter(src)}
                  className={`px-2 py-0.5 rounded border capitalize transition whitespace-nowrap ${
                    sourceFilter === src
                      ? 'border-neutral-900 bg-neutral-100 text-neutral-900 font-semibold'
                      : 'border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          {/* Lead List Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {loadingLeads ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-300" />
                Loading lead pipeline...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                No matching leads found for current criteria.
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = lead.id === selectedLeadId;

                // Subtle accent color strictly applied to status tags
                let statusBadgeClasses = 'bg-stone-100 text-stone-700 border-stone-200';
                if (lead.status_category === 'Hot') {
                  statusBadgeClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                } else if (lead.status_category === 'Visited') {
                  statusBadgeClasses = 'bg-sky-50 text-sky-800 border-sky-200';
                }

                return (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full text-left p-4 transition-all flex flex-col gap-2 relative ${
                      isSelected
                        ? 'bg-[#F9F9F8] border-l-4 border-l-neutral-900 pl-3.5'
                        : 'hover:bg-neutral-50/80 border-l-4 border-l-transparent'
                    }`}
                  >
                    {/* Header: Name + Status Tag (Subtle Accent) */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs tracking-tight text-neutral-900 truncate">
                            {lead.name}
                          </span>
                          {lead.is_taken_over && (
                            <span className="shrink-0 text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 text-white font-medium">
                              TAKEN OVER
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                          {lead.phone}
                        </div>
                      </div>

                      {/* STRICT CONSTRAINT: Subtle accent color ONLY on status tag */}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border shrink-0 ${statusBadgeClasses}`}
                      >
                        {lead.status_category} ({lead.status})
                      </span>
                    </div>

                    {/* Metadata: Source Tag (Monochromatic) + BHK + Budget */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-600">
                      {/* Monochromatic Source Tag */}
                      <span className="px-1.5 py-0.5 rounded border border-neutral-200 bg-neutral-100 text-neutral-700 text-[10px] font-mono uppercase tracking-wider">
                        {lead.source_tag}
                      </span>
                      <span className="text-neutral-300">·</span>
                      <span className="font-medium text-neutral-800">{lead.preferred_bhk}</span>
                      <span className="text-neutral-300">·</span>
                      <span className="text-neutral-600">{lead.budget}</span>
                    </div>

                    {/* Latest Message Preview */}
                    {lead.latest_message && (
                      <div className="text-[11px] text-neutral-500 line-clamp-1 italic mt-0.5">
                        <span className="font-medium text-neutral-600 not-italic">
                          {lead.latest_message.sender === 'user' ? 'Client: ' : 'AI: '}
                        </span>
                        {lead.latest_message.text}
                      </div>
                    )}

                    {/* Visit Status summary line */}
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
                      <span>{lead.project_id || 'Project 1'}</span>
                      <span>
                        {lead.slot_date_time
                          ? `Visit: ${new Date(lead.slot_date_time).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                            })}`
                          : lead.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* MAIN WORKSPACE: SPLIT-SCREEN VIEW                                          */}
        {/* Left Side: Structured Lead Data | Right Side: Full AI Chat Transcript     */}
        {/* ========================================================================= */}
        {selectedLead ? (
          <main className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-white">
            
            {/* --------------------------------------------------------------------- */}
            {/* SPLIT LEFT: Structured Lead Data (Budget, BHK, Visit Status, RERA, etc)*/}
            {/* --------------------------------------------------------------------- */}
            <section className="w-full xl:w-[480px] border-b xl:border-b-0 xl:border-r border-neutral-200 p-6 overflow-y-auto space-y-6 bg-white shrink-0">
              
              {/* Section Subtitle */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
                  Structured Buyer Record
                </span>
                <span className="text-[11px] font-mono text-neutral-400">
                  Lead #{selectedLead.id}
                </span>
              </div>

              {/* Lead Identity Card */}
              <div className="border border-neutral-200 rounded-lg p-5 space-y-4 bg-[#FAFAF9]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-neutral-900">
                      {selectedLead.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs text-neutral-600">{selectedLead.phone}</span>
                      <button
                        onClick={() => handleCopyPhone(selectedLead.phone)}
                        className="text-neutral-400 hover:text-neutral-800 p-0.5"
                        title="Copy phone"
                      >
                        {copiedPhone ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Subtle Accent Status Tag */}
                  <div className="text-right">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded border inline-block ${
                        selectedLead.status_category === 'Hot'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : selectedLead.status_category === 'Visited'
                          ? 'bg-sky-50 text-sky-800 border-sky-200'
                          : 'bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {selectedLead.status_category}
                    </span>
                    <div className="text-[10px] text-neutral-400 mt-1">
                      {selectedLead.status}
                    </div>
                  </div>
                </div>

                {/* Statutory DPDP Consent Badge */}
                <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-neutral-700">
                    <ShieldCheck className="w-4 h-4 text-neutral-900" />
                    <span className="font-medium text-[11px]">DPDP Act 2023 Consent</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Verified · Opt-out (STOP) Ready
                  </span>
                </div>
              </div>

              {/* Core Requirements Grid (BHK, Budget, Source Tag) */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-semibold block">
                  Buyer Requirements & Acquisition Parameters
                </span>

                <div className="grid grid-cols-2 gap-3">
                  {/* Preferred BHK */}
                  <div className="p-3.5 rounded-lg border border-neutral-200 bg-white space-y-1">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">
                      Preferred BHK
                    </div>
                    <div className="text-sm font-bold text-neutral-900">
                      {selectedLead.preferred_bhk}
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="p-3.5 rounded-lg border border-neutral-200 bg-white space-y-1">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">
                      Target Budget
                    </div>
                    <div className="text-sm font-bold text-neutral-900">
                      {selectedLead.budget}
                    </div>
                  </div>

                  {/* Source Tag */}
                  <div className="p-3.5 rounded-lg border border-neutral-200 bg-white space-y-1">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">
                      Acquisition Channel
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded border border-neutral-200 bg-neutral-100 text-neutral-800 text-xs font-mono font-medium">
                        {selectedLead.source_tag}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate">
                      {selectedLead.source}
                    </div>
                  </div>

                  {/* Initial Inquiry Date */}
                  <div className="p-3.5 rounded-lg border border-neutral-200 bg-white space-y-1">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">
                      Inquiry Logged
                    </div>
                    <div className="text-xs font-medium text-neutral-800">
                      {new Date(selectedLead.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Site Visit Status & Calendar Slot */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-semibold block">
                  Site Visit & Scheduling State
                </span>

                <div className="border border-neutral-200 rounded-lg p-4 space-y-3 bg-[#FAFAF9]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-neutral-700" />
                      <span className="text-xs font-semibold text-neutral-900">
                        Visit Slot Status
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-neutral-600">
                      {selectedLead.slot_id ? `Slot #${selectedLead.slot_id}` : 'Unscheduled'}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-neutral-200 rounded-md">
                    <div className="text-xs font-medium text-neutral-900">
                      {formatDateTime(selectedLead.slot_date_time)}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>
                        {selectedLead.slot_date_time
                          ? 'Background cron alerts: 24h & 2h reminders active'
                          : 'No site visit locked. AI can check availability upon request.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Assignment & RERA Disclosure */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-semibold block">
                  Project Registry & Mandatory RERA
                </span>

                <div className="border border-neutral-200 rounded-lg p-4 space-y-2.5 bg-white text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900">
                      {selectedLead.project_id || 'Project 1'}
                    </span>
                    <span className="font-mono text-neutral-600">
                      {selectedLead.project_pricing || '₹1.45 Cr - ₹2.20 Cr'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 flex items-start gap-2">
                    <Shield className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] uppercase font-mono text-neutral-400">
                        Statutory RERA Registration Number
                      </div>
                      <div className="font-mono text-[11px] text-neutral-800 break-all">
                        {selectedLead.project_rera || 'PRM/KA/RERA/1251/310/PR/210101/004001'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Executive Operational Notes */}
              <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-700">
                  <span className="font-semibold">Advisor Guardrail Protocol</span>
                  <span className="text-[10px] font-mono text-neutral-400">FactSheet Enforced</span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Autonomous AI only answers verified FactSheet parameters. If buyer requests custom discounts or off-plan data, human handoff is automatically triggered and assigned here.
                </p>
              </div>
            </section>

            {/* --------------------------------------------------------------------- */}
            {/* SPLIT RIGHT: Full AI Chat Transcript & Prominent Take Over Button    */}
            {/* --------------------------------------------------------------------- */}
            <section className="flex-1 flex flex-col bg-[#FAFAF9] overflow-hidden min-h-[500px]">
              
              {/* TRANSCRIPT TOP BAR: Conversation Status & Prominent Takeover CTA */}
              <div className="p-4 border-b border-neutral-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Live AI Chat Transcript
                    </h3>
                    {selectedLead.is_taken_over ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Lock className="w-3 h-3" />
                        Executive in Control
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        <Bot className="w-3 h-3 text-neutral-500" />
                        Autonomous AI Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Direct transcript feed with {selectedLead.name} ({selectedLead.phone})
                  </p>
                </div>

                {/* PROMINENT 'TAKE OVER CHAT' BUTTON */}
                <div className="flex items-center gap-2">
                  {selectedLead.is_taken_over ? (
                    <button
                      onClick={handleToggleTakeover}
                      disabled={submittingTakeover}
                      className="px-4 py-2 rounded-md bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition text-xs font-semibold shadow-sm flex items-center gap-2"
                      title="Release control back to autonomous AI Assistant"
                    >
                      <Unlock className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Release Control to AI</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleToggleTakeover}
                      disabled={submittingTakeover}
                      className="px-5 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white transition text-xs font-semibold shadow-md flex items-center gap-2 ring-2 ring-neutral-900/10"
                      title="Pause AI assistant and take over direct messaging with buyer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-neutral-200" />
                      <span>Take Over Chat</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Takeover Status Banner when Active */}
              {selectedLead.is_taken_over && (
                <div className="bg-neutral-900 text-white px-5 py-2.5 text-xs flex items-center justify-between border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>
                      Senior Residential Advisor (<strong>{selectedLead.executive_name || executiveName}</strong>) is currently handling this chat. Autonomous AI is paused.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 hidden md:inline">
                    Manual Intervention Mode
                  </span>
                </div>
              )}

              {/* CHAT TRANSCRIPT STREAM */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {loadingTranscript ? (
                  <div className="flex items-center justify-center h-full text-xs text-neutral-400">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    Loading conversation transcript...
                  </div>
                ) : transcript.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-xs text-neutral-400 space-y-2">
                    <MessageSquare className="w-8 h-8 text-neutral-300" />
                    <p>No messages recorded for this inquiry yet.</p>
                  </div>
                ) : (
                  transcript.map((msg) => {
                    const isUser = msg.sender === 'user';
                    const isExec = msg.sender === 'executive';
                    const isSystemNotice = msg.text.startsWith('[SYSTEM NOTICE]');

                    if (isSystemNotice) {
                      return (
                        <div key={msg.id} className="flex justify-center my-3">
                          <div className="px-3 py-1 rounded-full bg-neutral-200/70 border border-neutral-300 text-[10px] font-mono text-neutral-700 max-w-lg text-center">
                            {msg.text}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isUser ? 'items-end' : 'items-start'
                        }`}
                      >
                        {/* Sender header & timestamp */}
                        <div className="flex items-center gap-2 mb-1 text-[10px] text-neutral-400 font-mono">
                          <span>
                            {isUser
                              ? `${selectedLead.name} (Buyer)`
                              : isExec
                              ? 'Senior Residential Advisor (Executive)'
                              : 'Keshav AI Assistant'}
                          </span>
                          <span>·</span>
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`max-w-xl rounded-lg p-4 text-xs space-y-2 leading-relaxed ${
                            isUser
                              ? 'bg-neutral-900 text-white rounded-br-none shadow-sm'
                              : isExec
                              ? 'bg-neutral-800 text-white border border-neutral-700 rounded-bl-none shadow-sm'
                              : 'bg-white text-neutral-900 border border-neutral-200 rounded-bl-none shadow-sm'
                          }`}
                        >
                          {/* Tool call indicator if executed by AI */}
                          {msg.tool_calls && (
                            <div className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-2 py-1 rounded border border-neutral-200 mb-2">
                              🔧 Tool Triggered: {JSON.stringify(msg.tool_calls)}
                            </div>
                          )}

                          {/* Message Body */}
                          <div className="whitespace-pre-line">{msg.text}</div>

                          {/* RERA Footnote if Promotional */}
                          {msg.is_promotional && msg.rera_number && (
                            <div className="pt-2 mt-2 border-t border-neutral-200/40 text-[10px] font-mono text-neutral-400">
                              🏛️ Mandatory RERA: {msg.rera_number}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={transcriptEndRef} />
              </div>

              {/* LIVE EXECUTIVE MESSAGE COMPOSER */}
              <div className="p-4 bg-white border-t border-neutral-200">
                <form
                  onSubmit={handleSendExecutiveMessage}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder={
                      selectedLead.is_taken_over
                        ? `Type message as Senior Residential Advisor to ${selectedLead.name}...`
                        : `Take over & type message to ${selectedLead.name}...`
                    }
                    value={execMessageInput}
                    onChange={(e) => setExecMessageInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-md border border-neutral-300 text-xs bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg || !execMessageInput.trim()}
                    className="px-4 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-2 px-1">
                  <span>
                    Sending a message automatically updates the transcript and locks executive control.
                  </span>
                  <span>DPDP 2023 Compliant</span>
                </div>
              </div>
            </section>
          </main>
        ) : (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-xs text-neutral-400 bg-white">
            Select a lead from the pipeline on the left to inspect structured data and chat transcript.
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Building2,
  Calendar,
  Layers,
  Search,
  Plus,
  RefreshCw,
  GitMerge,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Database,
  PhoneCall,
  Sparkles,
  FileText,
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'leads' | 'factsheet' | 'slots' | 'schema'>('leads');
  const [leads, setLeads] = useState<any[]>([]);
  const [factSheets, setFactSheets] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbMode, setDbMode] = useState<string>('detecting...');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bhkFilter, setBhkFilter] = useState('');
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Lead Form State
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [leadFormData, setLeadFormData] = useState({
    name: '',
    phone: '',
    source: 'Property portal',
    preferred_bhk: '3 BHK',
    budget: '₹1.2 - 1.5 Cr',
    status: 'Booked',
    project_id: 'Project 1',
  });

  // FactSheet Form State
  const [showAddFsModal, setShowAddFsModal] = useState(false);
  const [fsFormData, setFsFormData] = useState({
    project_id: '',
    rera_number: '',
    details: '',
    pricing: '',
  });

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Health / DB Mode
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const health = await healthRes.json();
        setDbMode(health.dbMode || 'standard');
      }

      // 2. Leads
      const leadsRes = await fetch('/api/leads');
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data.data || []);
      }

      // 3. Fact Sheets
      const fsRes = await fetch('/api/factsheet');
      if (fsRes.ok) {
        const data = await fsRes.json();
        setFactSheets(data.data || []);
      }

      // 4. Slots
      const slotsRes = await fetch('/api/slots');
      if (slotsRes.ok) {
        const data = await slotsRes.json();
        setSlots(data.data || []);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reseed DB
  const handleReseed = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        setBannerMessage({
          type: 'success',
          text: 'Database successfully reseeded with Hardik Patel, Nidhi Shah, and Kavita Joshi mock data!',
        });
        await fetchData();
      }
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: 'Reseed failed: ' + err.message });
    }
  };

  // Submit Lead with Duplicate Check
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadFormData),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.merged) {
          setBannerMessage({
            type: 'info',
            text: `DUPLICATE DETECTED & MERGED: ${data.message}`,
          });
        } else {
          setBannerMessage({
            type: 'success',
            text: 'New lead added successfully.',
          });
        }
        setShowAddLeadModal(false);
        setLeadFormData({
          name: '',
          phone: '',
          source: 'Property portal',
          preferred_bhk: '3 BHK',
          budget: '₹1.2 - 1.5 Cr',
          status: 'Booked',
          project_id: 'Project 1',
        });
        await fetchData();
      } else {
        alert(data.error || 'Failed to save lead');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Quick Duplicate Test Trigger
  const handleTestDuplicateHardik = () => {
    setLeadFormData({
      name: 'Hardik Patel (Returning Inquiry)',
      phone: '9876543210', // Raw format of +91 98765 43210
      source: 'Direct Portal Re-visit',
      preferred_bhk: '3.5 BHK Penthouse',
      budget: '₹1.75 Cr',
      status: 'Booked',
      project_id: 'Project 1',
    });
    setShowAddLeadModal(true);
  };

  // Delete Lead
  const handleDeleteLead = async (id: number) => {
    if (!confirm(`Are you sure you want to delete lead #${id}?`)) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBannerMessage({ type: 'info', text: `Lead #${id} deleted.` });
        await fetchData();
      }
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  // Lock Slot
  const handleLockSlot = async (id: number) => {
    try {
      const res = await fetch(`/api/slots/${id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: 15 }),
      });
      const data = await res.json();
      if (res.ok) {
        setBannerMessage({ type: 'success', text: `Slot #${id} locked for 15 minutes!` });
        await fetchData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    if (statusFilter && lead.status !== statusFilter) return false;
    if (bhkFilter && lead.preferred_bhk !== bhkFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = lead.name?.toLowerCase().includes(q);
      const matchPhone = lead.phone?.toLowerCase().includes(q);
      const matchSource = lead.source?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchSource) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Keshav</h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Next.js + Node.js
                </span>
              </div>
              <p className="text-xs text-slate-400">PostgreSQL Real Estate Lead & Slot Booking Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sales Head Admin CMS */}
            <Link
              href="/admin/cms"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs hover:bg-slate-700 transition font-medium"
              title="Sales Head Admin Editor CMS (FactSheet & Visit Slots)"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Admin CMS</span>
            </Link>

            {/* Sales Head Performance Dashboard */}
            <Link
              href="/admin/performance"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs hover:bg-slate-700 transition font-medium"
              title="Sales Head Performance Analytics Dashboard"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Performance</span>
            </Link>

            {/* Sales Executive Unified Inbox */}
            <Link
              href="/inbox"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs hover:bg-indigo-500/20 transition font-medium"
              title="Sales Executive Unified Lead Inbox with Split Screen & Chat Takeover"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Executive Inbox</span>
            </Link>

            {/* Buyer Web Chat Interface Link */}
            <Link
              href="/chat"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs hover:bg-emerald-500/20 transition font-medium"
              title="Open Mobile-First Buyer Chat Interface (DPDP Compliant, Multilingual, RERA Appending)"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Buyer Chat</span>
            </Link>

            {/* DB Mode Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">DB Mode:</span>
              <span className="font-semibold text-emerald-400 capitalize">{dbMode}</span>
            </div>

            {/* Quick Test Duplicate Button */}
            <button
              onClick={handleTestDuplicateHardik}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs hover:bg-amber-500/20 transition"
              title="Test Phone Duplicate Check with Hardik Patel's number"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Test Duplicate Merge</span>
            </button>

            {/* Reseed Button */}
            <button
              onClick={handleReseed}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-md shadow-indigo-600/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Reset & Seed Mock</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Banner Alert */}
        {bannerMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-fade-in ${
              bannerMessage.type === 'info'
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                : bannerMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {bannerMessage.type === 'info' ? (
                <GitMerge className="w-5 h-5 text-amber-400 shrink-0" />
              ) : bannerMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              onClick={() => setBannerMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Total Leads</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">{leads.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              Booked: {leads.filter((l) => l.status === 'Booked').length} | Visited:{' '}
              {leads.filter((l) => l.status === 'Visited').length}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">FactSheet Projects</span>
              <Building2 className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-2xl font-bold text-white">{factSheets.length}</div>
            <p className="text-xs text-slate-500 mt-1">Verified RERA specifications</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Visit Slots</span>
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">{slots.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              {slots.filter((s) => !s.is_booked).length} Available for booking
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Phone Deduplication</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">Active</div>
            <p className="text-xs text-slate-500 mt-1">Auto-merges matching phones</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('leads')}
            className={`pb-3 font-medium transition flex items-center gap-2 border-b-2 ${
              activeTab === 'leads'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Leads Table ({leads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('factsheet')}
            className={`pb-3 font-medium transition flex items-center gap-2 border-b-2 ${
              activeTab === 'factsheet'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>FactSheet Projects ({factSheets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('slots')}
            className={`pb-3 font-medium transition flex items-center gap-2 border-b-2 ${
              activeTab === 'slots'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>VisitSlots ({slots.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`pb-3 font-medium transition flex items-center gap-2 border-b-2 ${
              activeTab === 'schema'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Schema & API Details</span>
          </button>
        </div>

        {/* TAB 1: LEADS */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Filter and Action Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, phone, source..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-500"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-300"
                >
                  <option value="">All Statuses</option>
                  <option value="Booked">Booked</option>
                  <option value="Visited">Visited</option>
                  <option value="Not booked">Not booked</option>
                  <option value="New">New</option>
                </select>

                {/* BHK Filter */}
                <select
                  value={bhkFilter}
                  onChange={(e) => setBhkFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-300"
                >
                  <option value="">All Configurations</option>
                  <option value="2 BHK">2 BHK</option>
                  <option value="3 BHK">3 BHK</option>
                </select>
              </div>

              <button
                onClick={() => setShowAddLeadModal(true)}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add / Merge Lead</span>
              </button>
            </div>

            {/* Leads Table */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/90 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-3.5">ID</th>
                      <th className="px-6 py-3.5">Client & Phone</th>
                      <th className="px-6 py-3.5">Source</th>
                      <th className="px-6 py-3.5">Project & BHK</th>
                      <th className="px-6 py-3.5">Budget</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Created At</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                          No leads matching the criteria. Click &quot;Add / Merge Lead&quot; or reseed.
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">#{lead.id}</td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-white flex items-center gap-2">
                              {lead.name}
                              {lead.phone?.includes('98765') && (
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                  Mock #1
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <PhoneCall className="w-3 h-3 text-slate-500" />
                              {lead.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            <span className="px-2.5 py-1 rounded-md bg-slate-800 text-xs border border-slate-700/60">
                              {lead.source || 'Direct'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-200">{lead.project_id || 'General'}</div>
                            <div className="text-xs text-indigo-400 font-medium">{lead.preferred_bhk || 'Flexible'}</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-300">{lead.budget || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                lead.status === 'Booked'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : lead.status === 'Visited'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                  : lead.status === 'Not booked'
                                  ? 'bg-slate-700/40 text-slate-400 border border-slate-700'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  lead.status === 'Booked'
                                    ? 'bg-emerald-400'
                                    : lead.status === 'Visited'
                                    ? 'bg-blue-400'
                                    : lead.status === 'Not booked'
                                    ? 'bg-slate-400'
                                    : 'bg-amber-400'
                                }`}
                              />
                              {lead.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition"
                              title="Delete lead"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FACT SHEET */}
        {activeTab === 'factsheet' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Project Fact Sheets</h3>
                <p className="text-xs text-slate-400">
                  Core table `FactSheet (project_id, rera_number, details, pricing)`
                </p>
              </div>
              <button
                onClick={() => setShowAddFsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add FactSheet</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {factSheets.map((fs) => (
                <div
                  key={fs.project_id}
                  className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">Project ID</span>
                      <h4 className="text-xl font-bold text-white">{fs.project_id}</h4>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-xs">
                      {fs.pricing}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-xs text-slate-300">
                    <span className="text-slate-500">RERA: </span>
                    <span className="text-amber-400">{fs.rera_number}</span>
                  </div>

                  <p className="text-sm text-slate-400 leading-relaxed">{fs.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: VISIT SLOTS */}
        {activeTab === 'slots' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Site Visit Scheduling & Slots</h3>
                <p className="text-xs text-slate-400">
                  Core table `VisitSlots (id, date_time, is_booked, locked_until)`
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {slots.map((slot) => {
                const isLocked = slot.locked_until && new Date(slot.locked_until) > new Date();
                return (
                  <div
                    key={slot.id}
                    className={`p-5 rounded-2xl border transition space-y-3 ${
                      slot.is_booked
                        ? 'bg-indigo-950/20 border-indigo-500/30'
                        : isLocked
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-500">Slot #{slot.id}</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          slot.is_booked
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : isLocked
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {slot.is_booked ? 'Booked' : isLocked ? 'Locked (15m)' : 'Available'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-base font-bold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        {new Date(slot.date_time).toLocaleDateString()}{' '}
                        {new Date(slot.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs text-slate-400">{slot.project_id || 'All Projects'}</div>
                    </div>

                    {!slot.is_booked && !isLocked && (
                      <button
                        onClick={() => handleLockSlot(slot.id)}
                        className="w-full mt-2 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
                      >
                        Temporary Lock (15 min)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: SCHEMA & ARCHITECTURE */}
        {activeTab === 'schema' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                PostgreSQL Core Schema Implementation
              </h3>
              <p className="text-sm text-slate-400">
                Created with the 3 exact requested core tables, foreign key integrity, and optimized indexing.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                {/* Leads Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2">
                  <div className="text-indigo-400 font-bold text-sm">Table: leads</div>
                  <ul className="space-y-1 text-slate-300">
                    <li>• id: SERIAL PRIMARY KEY</li>
                    <li>• name: VARCHAR(255) NOT NULL</li>
                    <li>• phone: VARCHAR(50) (Indexed)</li>
                    <li>• source: VARCHAR(100)</li>
                    <li>• preferred_bhk: VARCHAR(50)</li>
                    <li>• budget: VARCHAR(100)</li>
                    <li>• status: VARCHAR(50)</li>
                    <li>• created_at: TIMESTAMPTZ</li>
                    <li className="text-slate-500">• project_id: REFERENCES fact_sheet</li>
                    <li className="text-slate-500">• slot_id: REFERENCES visit_slots</li>
                  </ul>
                </div>

                {/* FactSheet Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-violet-500/30 space-y-2">
                  <div className="text-violet-400 font-bold text-sm">Table: fact_sheet</div>
                  <ul className="space-y-1 text-slate-300">
                    <li>• project_id: VARCHAR(100) PRIMARY KEY</li>
                    <li>• rera_number: VARCHAR(100) NOT NULL</li>
                    <li>• details: TEXT NOT NULL</li>
                    <li>• pricing: VARCHAR(100) NOT NULL</li>
                    <li>• created_at: TIMESTAMPTZ</li>
                  </ul>
                </div>

                {/* VisitSlots Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
                  <div className="text-emerald-400 font-bold text-sm">Table: visit_slots</div>
                  <ul className="space-y-1 text-slate-300">
                    <li>• id: SERIAL PRIMARY KEY</li>
                    <li>• date_time: TIMESTAMPTZ NOT NULL</li>
                    <li>• is_booked: BOOLEAN DEFAULT FALSE</li>
                    <li>• locked_until: TIMESTAMPTZ NULL</li>
                    <li className="text-slate-500">• project_id: REFERENCES fact_sheet</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Duplicate Check Logic Explanation */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                Phone Duplicate Check & Merge Logic
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                When a lead is submitted via <code className="text-indigo-300">POST /api/leads</code>, the service
                normalizes the phone number (stripping symbols, spacing, and international prefix differences so that{' '}
                <code className="text-slate-200">+91 98765 43210</code>, <code className="text-slate-200">9876543210</code>,
                and <code className="text-slate-200">98765-43210</code> resolve to the same canonical identity).
              </p>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
                <div className="text-emerald-400">// If duplicate phone is detected:</div>
                <div>1. Retains original lead ID and creation timestamp.</div>
                <div>2. Overwrites non-null attributes (e.g. updated BHK preference, budget, new status).</div>
                <div>3. Emits `merged: true` with HTTP 200 and previous lead snapshot.</div>
                <div className="text-amber-400">// If no duplicate:</div>
                <div>4. Creates new lead row with HTTP 201.</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Add or Merge Lead */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Add Lead / Test Merge Logic
              </h3>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={leadFormData.name}
                  onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                  placeholder="e.g. Hardik Patel"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Phone Number * (Duplicate Key)
                </label>
                <input
                  type="text"
                  required
                  value={leadFormData.phone}
                  onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210 or 9876543210"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-white font-mono"
                />
                <p className="text-[11px] text-amber-400/80 mt-1">
                  Tip: Entering a phone matching an existing lead will merge the data!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Source</label>
                  <select
                    value={leadFormData.source}
                    onChange={(e) => setLeadFormData({ ...leadFormData, source: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-200"
                  >
                    <option value="Property portal">Property portal</option>
                    <option value="Social media ad">Social media ad</option>
                    <option value="Hoarding call">Hoarding call</option>
                    <option value="Walk-in">Walk-in</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Preferred BHK</label>
                  <select
                    value={leadFormData.preferred_bhk}
                    onChange={(e) => setLeadFormData({ ...leadFormData, preferred_bhk: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-200"
                  >
                    <option value="1 BHK">1 BHK</option>
                    <option value="2 BHK">2 BHK</option>
                    <option value="3 BHK">3 BHK</option>
                    <option value="3.5 BHK">3.5 BHK</option>
                    <option value="4 BHK">4 BHK</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Budget</label>
                  <input
                    type="text"
                    value={leadFormData.budget}
                    onChange={(e) => setLeadFormData({ ...leadFormData, budget: e.target.value })}
                    placeholder="e.g. ₹1.2 - 1.5 Cr"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                  <select
                    value={leadFormData.status}
                    onChange={(e) => setLeadFormData({ ...leadFormData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-slate-200"
                  >
                    <option value="Booked">Booked</option>
                    <option value="Visited">Visited</option>
                    <option value="Not booked">Not booked</option>
                    <option value="New">New</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition shadow-lg shadow-indigo-600/20"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

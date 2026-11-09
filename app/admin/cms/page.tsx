'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Unlock,
  Shield,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sliders,
  Sparkles,
  Layers,
  BarChart3,
  MessageSquare,
  Home,
} from 'lucide-react';

interface FactSheet {
  project_id: string;
  rera_number: string;
  details: string;
  pricing: string;
  created_at?: string;
  updated_at?: string;
}

interface VisitSlot {
  id: number;
  date_time: string;
  is_booked: boolean;
  locked_until: string | null;
  project_id: string | null;
  reminder_24h_sent?: boolean;
  reminder_2h_sent?: boolean;
  created_at?: string;
}

export default function AdminEditorCMS() {
  const [activeTab, setActiveTab] = useState<'factsheet' | 'slots'>('factsheet');
  const [factSheets, setFactSheets] = useState<FactSheet[]>([]);
  const [slots, setSlots] = useState<VisitSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // FactSheet Edit/Create State
  const [editingFs, setEditingFs] = useState<FactSheet | null>(null);
  const [isCreatingFs, setIsCreatingFs] = useState<boolean>(false);
  const [fsFormData, setFsFormData] = useState<FactSheet>({
    project_id: '',
    rera_number: '',
    details: '',
    pricing: '',
  });

  // Slot Filter & Create State
  const [slotFilter, setSlotFilter] = useState<'all' | 'available' | 'locked' | 'booked'>('all');
  const [isCreatingSlot, setIsCreatingSlot] = useState<boolean>(false);
  const [newSlotDateTime, setNewSlotDateTime] = useState<string>('');
  const [newSlotProject, setNewSlotProject] = useState<string>('Project 1');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch FactSheet and Slots
  const fetchData = async () => {
    setLoading(true);
    try {
      const [fsRes, slotsRes] = await Promise.all([
        fetch('/api/factsheet'),
        fetch('/api/slots'),
      ]);

      if (fsRes.ok) {
        const fsData = await fsRes.json();
        setFactSheets(fsData.data || []);
      }

      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        setSlots(slotsData.data || []);
      }
    } catch (err) {
      console.error('Failed to load CMS data:', err);
      showToast('Error loading CMS data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save FactSheet (Update or Create)
  const handleSaveFactSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isCreatingFs) {
        const res = await fetch('/api/factsheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fsFormData),
        });
        const data = await res.json();
        if (res.ok) {
          showToast(`FactSheet for ${fsFormData.project_id} created successfully.`);
          setIsCreatingFs(false);
          await fetchData();
        } else {
          alert(data.error || 'Failed to create FactSheet');
        }
      } else if (editingFs) {
        const res = await fetch(`/api/factsheet/${editingFs.project_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rera_number: fsFormData.rera_number,
            details: fsFormData.details,
            pricing: fsFormData.pricing,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast(`FactSheet for ${editingFs.project_id} updated.`);
          setEditingFs(null);
          await fetchData();
        } else {
          alert(data.error || 'Failed to update FactSheet');
        }
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete FactSheet
  const handleDeleteFactSheet = async (projectId: string) => {
    if (!confirm(`Are you sure you want to delete FactSheet for "${projectId}"?`)) return;
    try {
      const res = await fetch(`/api/factsheet/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`FactSheet for ${projectId} removed.`);
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Create Visit Slot
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotDateTime) {
      alert('Please select date and time for the slot.');
      return;
    }
    try {
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_time: new Date(newSlotDateTime).toISOString(),
          project_id: newSlotProject,
          is_booked: false,
        }),
      });
      if (res.ok) {
        showToast('New visit slot added successfully.');
        setIsCreatingSlot(false);
        setNewSlotDateTime('');
        await fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add slot');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Slot
  const handleDeleteSlot = async (id: number) => {
    if (!confirm(`Delete Slot #${id}?`)) return;
    try {
      const res = await fetch(`/api/slots/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Slot #${id} deleted.`);
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Unlock Slot manually
  const handleUnlockSlot = async (id: number) => {
    try {
      const res = await fetch(`/api/slots/${id}/unlock`, { method: 'POST' });
      if (res.ok) {
        showToast(`Slot #${id} lock released.`);
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Toggle Slot Booked Status
  const handleToggleBooked = async (slot: VisitSlot) => {
    try {
      const res = await fetch(`/api/slots/${slot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_booked: !slot.is_booked, locked_until: null }),
      });
      if (res.ok) {
        showToast(`Slot #${slot.id} set to ${!slot.is_booked ? 'Booked' : 'Available'}.`);
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Format date helper
  const formatDateTime = (dateStr: string) => {
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

  // Filtered Slots
  const now = new Date();
  const filteredSlots = slots.filter((slot) => {
    const isLocked = slot.locked_until && new Date(slot.locked_until) > now;
    if (slotFilter === 'available') {
      return !slot.is_booked && !isLocked;
    }
    if (slotFilter === 'locked') {
      return isLocked;
    }
    if (slotFilter === 'booked') {
      return slot.is_booked;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#18181B] font-sans antialiased selection:bg-neutral-900 selection:text-white flex flex-col">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 border border-neutral-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP EXECUTIVE NAVIGATION BAR */}
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
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
                    Sales Head Suite
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-normal">
                  Admin Editor CMS · FactSheet Knowledge Base & Visit Slot Inventory
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {/* Link to Performance Dashboard */}
            <Link
              href="/admin/performance"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
              title="Sales Head Performance Analytics Dashboard"
            >
              <BarChart3 className="w-3.5 h-3.5 text-neutral-500" />
              <span>Performance Dashboard</span>
            </Link>

            {/* Link to Unified Inbox */}
            <Link
              href="/inbox"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
            >
              <Layers className="w-3.5 h-3.5 text-neutral-500" />
              <span>Executive Inbox</span>
            </Link>

            {/* Link to Buyer Chat */}
            <Link
              href="/chat"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
            >
              <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
              <span>Buyer Chat</span>
            </Link>

            {/* Link to CRM Dashboard */}
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition shadow-sm"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Admin CRM</span>
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl w-full mx-auto p-6 md:p-8 flex-1 space-y-8">
        
        {/* HERO TITLE & SUBTITLE */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
              Sales Head Control Center
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mt-1">
              Admin Editor CMS
            </h1>
            <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
              Maintain the single source of truth for the AI Assistant. All text edits in the FactSheet table are strictly enforced by the autonomous sales agent, while the slot calendar manages real-time site visits.
            </p>
          </div>

          {/* CMS Sub-Navigation Tabs */}
          <div className="flex items-center p-1 rounded-lg bg-neutral-200/60 border border-neutral-200 text-xs font-medium">
            <button
              onClick={() => setActiveTab('factsheet')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${
                activeTab === 'factsheet'
                  ? 'bg-white text-neutral-900 shadow-sm font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <FileText className="w-4 h-4 text-neutral-600" />
              <span>FactSheet Table ({factSheets.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${
                activeTab === 'slots'
                  ? 'bg-white text-neutral-900 shadow-sm font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-neutral-600" />
              <span>Visit Slots ({slots.length})</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: FACTSHEET TABLE EDITOR                                            */}
        {/* ========================================================================= */}
        {activeTab === 'factsheet' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Project Knowledge Base (FactSheet)
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  The AI Assistant guardrail permits answering buyer inquiries <strong>strictly</strong> using this data.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingFs(null);
                  setIsCreatingFs(true);
                  setFsFormData({
                    project_id: '',
                    rera_number: '',
                    details: '',
                    pricing: '',
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add FactSheet</span>
              </button>
            </div>

            {/* AI Guardrail Info Notice */}
            <div className="p-4 rounded-lg border border-neutral-200 bg-white flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-neutral-700" />
              </div>
              <div className="text-xs leading-relaxed">
                <span className="font-semibold text-neutral-900">Strict Guardrail Enforced: </span>
                <span className="text-neutral-600">
                  Any question outside the descriptions or pricing below will immediately trigger a <code>human_handoff</code> to your sales team with the prompt: <em>&ldquo;A sales executive will confirm this detail for you. Would you like to schedule a site visit in the meantime?&rdquo;</em>
                </span>
              </div>
            </div>

            {/* FactSheets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {factSheets.map((fs) => (
                <div
                  key={fs.project_id}
                  className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4 relative flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Project ID + Actions */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
                          Project FactSheet
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900 mt-0.5">
                          {fs.project_id}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setIsCreatingFs(false);
                            setEditingFs(fs);
                            setFsFormData(fs);
                          }}
                          className="p-1.5 rounded-md border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition"
                          title="Edit FactSheet Text"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFactSheet(fs.project_id)}
                          className="p-1.5 rounded-md border border-neutral-200 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete Project FactSheet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Official Pricing */}
                    <div className="p-3 rounded-lg bg-[#FAFAF9] border border-neutral-200/80">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                        Authorized Pricing Parameter
                      </div>
                      <div className="text-sm font-bold text-neutral-900 mt-0.5">
                        {fs.pricing}
                      </div>
                    </div>

                    {/* Specifications & Details Text */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                        Project Details & Specifications Text
                      </div>
                      <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line bg-[#FAFAF9] p-3 rounded-lg border border-neutral-200/60">
                        {fs.details}
                      </p>
                    </div>

                    {/* Mandatory RERA Number */}
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <Shield className="w-4 h-4 text-neutral-400 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-mono text-neutral-400">
                          Mandatory RERA:{' '}
                        </span>
                        <span className="font-mono text-neutral-800 text-[11px] font-medium">
                          {fs.rera_number}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                    <span>Last Updated: {fs.updated_at ? new Date(fs.updated_at).toLocaleDateString('en-IN') : 'Default'}</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-sans font-medium">
                      Live in AI Memory
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* FactSheet Create / Edit Modal */}
            {(editingFs || isCreatingFs) && (
              <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl border border-neutral-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                    <h3 className="font-bold text-base text-neutral-900">
                      {isCreatingFs ? 'Create New FactSheet' : `Edit FactSheet (${editingFs?.project_id})`}
                    </h3>
                    <button
                      onClick={() => {
                        setEditingFs(null);
                        setIsCreatingFs(false);
                      }}
                      className="text-neutral-400 hover:text-neutral-700 p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveFactSheet} className="space-y-4 text-xs">
                    {/* Project ID */}
                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">
                        Project ID / Identifier
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!isCreatingFs}
                        placeholder="e.g. Project 1, Project 3"
                        value={fsFormData.project_id}
                        onChange={(e) => setFsFormData({ ...fsFormData, project_id: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-neutral-200 bg-[#FAFAF9] disabled:opacity-60 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      />
                    </div>

                    {/* RERA Registration */}
                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">
                        Mandatory RERA Registration Number
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. PRM/KA/RERA/1251/310/PR/..."
                        value={fsFormData.rera_number}
                        onChange={(e) => setFsFormData({ ...fsFormData, rera_number: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      />
                    </div>

                    {/* Official Pricing */}
                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">
                        Pricing Summary & Thresholds
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Starting from ₹1.25 Cr"
                        value={fsFormData.pricing}
                        onChange={(e) => setFsFormData({ ...fsFormData, pricing: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      />
                    </div>

                    {/* Details Text Area */}
                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">
                        FactSheet Specifications & Amenities (AI Knowledge Corpus)
                      </label>
                      <textarea
                        required
                        rows={5}
                        placeholder="Enter full details of configurations, amenities, club house, location connectivity..."
                        value={fsFormData.details}
                        onChange={(e) => setFsFormData({ ...fsFormData, details: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 leading-relaxed font-sans"
                      />
                    </div>

                    {/* Modal Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFs(null);
                          setIsCreatingFs(false);
                        }}
                        className="px-4 py-2 rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white font-semibold transition shadow-sm flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save & Update AI Memory</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: VISIT SLOTS INVENTORY MANAGEMENT                                  */}
        {/* ========================================================================= */}
        {activeTab === 'slots' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header + Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Site Visit Slot Inventory
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Manage available calendar slots, 2-minute temporary locks, and confirmed booking reservations.
                </p>
              </div>

              <button
                onClick={() => setIsCreatingSlot(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition shadow-sm self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Visit Slot</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mr-1 font-semibold">
                Filter:
              </span>
              <button
                onClick={() => setSlotFilter('all')}
                className={`px-3 py-1 rounded-md border transition ${
                  slotFilter === 'all'
                    ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                All ({slots.length})
              </button>
              <button
                onClick={() => setSlotFilter('available')}
                className={`px-3 py-1 rounded-md border transition ${
                  slotFilter === 'available'
                    ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                Available ({slots.filter((s) => !s.is_booked && (!s.locked_until || new Date(s.locked_until) <= now)).length})
              </button>
              <button
                onClick={() => setSlotFilter('locked')}
                className={`px-3 py-1 rounded-md border transition ${
                  slotFilter === 'locked'
                    ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                Locked ({slots.filter((s) => s.locked_until && new Date(s.locked_until) > now).length})
              </button>
              <button
                onClick={() => setSlotFilter('booked')}
                className={`px-3 py-1 rounded-md border transition ${
                  slotFilter === 'booked'
                    ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                Booked ({slots.filter((s) => s.is_booked).length})
              </button>
            </div>

            {/* Slots Inventory Table */}
            <div className="border border-neutral-200 rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-[#FAFAF9] text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                      <th className="py-3 px-4">Slot ID</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Reservation Status</th>
                      <th className="py-3 px-4">Lock Expiration</th>
                      <th className="py-3 px-4">Cron Reminders</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-sans">
                    {filteredSlots.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-400">
                          No visit slots found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredSlots.map((slot) => {
                        const isLocked = slot.locked_until && new Date(slot.locked_until) > now;
                        const remainingSec = isLocked
                          ? Math.ceil((new Date(slot.locked_until!).getTime() - now.getTime()) / 1000)
                          : 0;

                        return (
                          <tr key={slot.id} className="hover:bg-neutral-50/70 transition">
                            <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                              #{slot.id}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-neutral-900">
                              {formatDateTime(slot.date_time)}
                            </td>
                            <td className="py-3.5 px-4 text-neutral-600 font-medium">
                              {slot.project_id || 'Project 1'}
                            </td>
                            <td className="py-3.5 px-4">
                              {slot.is_booked ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Booked
                                </span>
                              ) : isLocked ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                  <Lock className="w-3 h-3" />
                                  Locked ({remainingSec}s)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                                  Available
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-500">
                              {isLocked ? (
                                <span className="text-amber-700">
                                  {new Date(slot.locked_until!).toLocaleTimeString()}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-[11px] text-neutral-500 font-mono">
                              {slot.is_booked ? (
                                <span>24h & 2h Active</span>
                              ) : (
                                'Queued'
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isLocked && (
                                  <button
                                    onClick={() => handleUnlockSlot(slot.id)}
                                    className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
                                    title="Release 2-minute lock"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleToggleBooked(slot)}
                                  className="px-2 py-1 rounded text-[10px] font-medium border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition"
                                  title="Toggle booking status"
                                >
                                  {slot.is_booked ? 'Mark Unbooked' : 'Mark Booked'}
                                </button>
                                <button
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 transition"
                                  title="Delete slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create Slot Modal */}
            {isCreatingSlot && (
              <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl border border-neutral-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                    <h3 className="font-bold text-base text-neutral-900">
                      Add New Visit Slot
                    </h3>
                    <button
                      onClick={() => setIsCreatingSlot(false)}
                      className="text-neutral-400 hover:text-neutral-700 p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">
                        Project Assignment
                      </label>
                      <select
                        value={newSlotProject}
                        onChange={(e) => setNewSlotProject(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      >
                        <option value="Project 1">Project 1 (Keshav Sky Villas)</option>
                        <option value="Project 2">Project 2 (Keshav Urban Heights)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">
                        Date & Time (Site Visit Slot)
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={newSlotDateTime}
                        onChange={(e) => setNewSlotDateTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                      <button
                        type="button"
                        onClick={() => setIsCreatingSlot(false)}
                        className="px-4 py-2 rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white font-semibold transition shadow-sm"
                      >
                        Create Slot
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

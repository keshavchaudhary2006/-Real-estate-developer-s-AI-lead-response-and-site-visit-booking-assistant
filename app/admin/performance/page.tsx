'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Home,
  MessageSquare,
  Sparkles,
  HelpCircle,
  FileText,
  DollarSign,
  ChevronRight,
  PieChart,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface MetricSummary {
  total_leads: number;
  cost_per_lead_assumption: number;
  total_spend: number;
  total_visits: number;
}

interface SegmentedSource {
  source: string;
  lead_count: number;
  total_spend: number;
  visits_count: number;
  conversion_rate: number;
  cost_per_visit: number | null;
  cost_per_visit_formatted: string;
}

interface PerformanceData {
  success: boolean;
  timestamp: string;
  summary: MetricSummary;
  metrics: {
    median_first_response_time: {
      value_minutes: number;
      formatted: string;
      target_minutes: number;
      target_formatted: string;
      is_target_met: boolean;
      variance_percent: number;
      sampled_leads_count: number;
    };
    unreached_in_48h: {
      percentage: number;
      formatted: string;
      unreached_count: number;
      total_leads: number;
      is_sla_healthy: boolean;
    };
    lead_to_visit_conversion: {
      rate_percentage: number;
      formatted: string;
      visits_count: number;
      total_leads: number;
    };
    cost_per_visit_segmented: SegmentedSource[];
    blended_cost_per_visit: {
      value: number | null;
      formatted: string;
    };
  };
  lead_audit_records: Array<{
    id: number;
    name: string;
    phone: string;
    source: string;
    source_tag: string;
    preferred_bhk: string;
    budget: string;
    status: string;
    created_at: string;
    first_response_minutes: number | null;
    age_hours: number;
    is_unreached_in_48h: boolean;
    has_visit: boolean;
  }>;
}

export default function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<'all' | '30d' | '7d'>('all');

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/performance');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load performance metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const metrics = data?.metrics;
  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#18181B] font-sans antialiased selection:bg-neutral-900 selection:text-white flex flex-col">
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
                  High-Level Performance Dashboard · Executive Pipeline Health & Acquisition ROI
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {/* Refresh Button */}
            <button
              onClick={fetchMetrics}
              className="p-2 rounded-md border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition mr-1"
              title="Refresh Metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Link to Admin Editor CMS */}
            <Link
              href="/admin/cms"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
              title="FactSheet & Visit Slots Editor"
            >
              <FileText className="w-3.5 h-3.5 text-neutral-500" />
              <span>Admin Editor CMS</span>
            </Link>

            {/* Link to Unified Inbox */}
            <Link
              href="/inbox"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition"
            >
              <Layers className="w-3.5 h-3.5 text-neutral-500" />
              <span>Executive Inbox</span>
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

      {/* DASHBOARD BODY */}
      <main className="max-w-7xl w-full mx-auto p-6 md:p-8 flex-1 space-y-10">
        
        {/* TITLE & TIME HORIZON BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
              Executive Analytics & Pipeline Velocity
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mt-1">
              Sales Performance Dashboard
            </h1>
            <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
              Real-time monitoring of response speed, SLA compliance, lead-to-visit conversion efficiency, and channel acquisition cost (₹1,000/lead spend model).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-neutral-400">
              Assumption: ₹1,000/lead
            </span>
            <div className="h-4 w-px bg-neutral-200" />
            <div className="flex items-center p-0.5 rounded-lg bg-neutral-200/60 border border-neutral-200 text-xs">
              <button
                onClick={() => setTimeRange('all')}
                className={`px-3 py-1 rounded transition text-[11px] font-medium ${
                  timeRange === 'all'
                    ? 'bg-white text-neutral-900 shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1 rounded transition text-[11px] font-medium ${
                  timeRange === '30d'
                    ? 'bg-white text-neutral-900 shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1 rounded transition text-[11px] font-medium ${
                  timeRange === '7d'
                    ? 'bg-white text-neutral-900 shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Last 7 Days
              </button>
            </div>
          </div>
        </div>

        {loading || !data ? (
          <div className="py-20 text-center text-xs text-neutral-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-neutral-300" />
            Calculating executive performance metrics...
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* FOUR CORE SALES HEAD KPI CARDS                                           */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* KPI 1: Median First Response Time (target < 5 mins) */}
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between text-neutral-500">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                      First Response Time
                    </span>
                    <Clock className="w-4 h-4 text-neutral-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-neutral-900">
                      {metrics.median_first_response_time.formatted}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">median</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Target Benchmark:</span>
                    <span className="font-mono font-semibold text-neutral-900">
                      &lt; 5.0 mins
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {metrics.median_first_response_time.is_target_met ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Target Achieved (Sub-5m SLA)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        <AlertTriangle className="w-3 h-3" />
                        Exceeds 5m SLA Target
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* KPI 2: Percentage of leads not reached in 48 hours */}
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between text-neutral-500">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                      Unreached in 48 Hours
                    </span>
                    <AlertTriangle className="w-4 h-4 text-neutral-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-neutral-900">
                      {metrics.unreached_in_48h.formatted}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      ({metrics.unreached_in_48h.unreached_count} of {metrics.unreached_in_48h.total_leads})
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Industry SLA Threshold:</span>
                    <span className="font-mono font-semibold text-neutral-900">
                      &le; 10%
                    </span>
                  </div>
                  <div>
                    {metrics.unreached_in_48h.is_sla_healthy ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Zero Backlog (&lt;10%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        Outreach Attention Required
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* KPI 3: Lead-to-Visit Conversion Rate */}
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between text-neutral-500">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                      Lead-to-Visit Conversion
                    </span>
                    <TrendingUp className="w-4 h-4 text-neutral-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-neutral-900">
                      {metrics.lead_to_visit_conversion.formatted}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">rate</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Confirmed Visits:</span>
                    <span className="font-mono font-semibold text-neutral-900">
                      {metrics.lead_to_visit_conversion.visits_count} visits / {summary.total_leads} leads
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-neutral-900 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, metrics.lead_to_visit_conversion.rate_percentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* KPI 4: Blended Cost-per-Visit (CPV) */}
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between text-neutral-500">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                      Blended Cost-Per-Visit
                    </span>
                    <DollarSign className="w-4 h-4 text-neutral-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-neutral-900">
                      {metrics.blended_cost_per_visit.formatted}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">/ visit</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Total Spend (₹1k/lead):</span>
                    <span className="font-mono font-semibold text-neutral-900">
                      ₹{summary.total_spend.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    {summary.total_visits} confirmed visits generated
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SEGMENTED COST-PER-VISIT BY SOURCE TABLE (₹1,000 PER LEAD ASSUMPTION)     */}
            {/* ========================================================================= */}
            <div className="border border-neutral-200 rounded-xl bg-white shadow-sm overflow-hidden space-y-4 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
                    Acquisition Efficiency Breakdown
                  </div>
                  <h2 className="text-base font-bold text-neutral-900 mt-0.5">
                    Cost-per-Visit Segmented by Source Channel
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Strict spend assumption of <strong>₹1,000 per lead</strong> across Portal, Ads, Hoarding, and Direct sources.
                  </p>
                </div>

                <div className="text-xs font-mono text-neutral-400 bg-neutral-50 px-3 py-1.5 rounded border border-neutral-200">
                  Formula: (Lead Volume &times; ₹1,000) &divide; Confirmed Visits
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-[#FAFAF9] text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                      <th className="py-3 px-4">Source Channel</th>
                      <th className="py-3 px-4">Leads Acquired</th>
                      <th className="py-3 px-4">Total Spend (₹1k/lead)</th>
                      <th className="py-3 px-4">Converted Visits</th>
                      <th className="py-3 px-4">Conversion Rate</th>
                      <th className="py-3 px-4 text-right">Cost-Per-Visit (CPV)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-sans">
                    {metrics.cost_per_visit_segmented.map((item) => {
                      const hasVisits = item.visits_count > 0;
                      return (
                        <tr key={item.source} className="hover:bg-neutral-50/70 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-neutral-900 text-xs">
                              {item.source}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-neutral-800">
                            {item.lead_count}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-neutral-600">
                            ₹{item.total_spend.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-neutral-900">
                            {item.visits_count}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium text-neutral-800">
                                {item.conversion_rate}%
                              </span>
                              <div className="w-16 bg-neutral-100 h-1 rounded-full overflow-hidden">
                                <div
                                  className="bg-neutral-800 h-full rounded-full"
                                  style={{ width: `${Math.min(100, item.conversion_rate)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {hasVisits ? (
                              <span className="font-mono font-bold text-neutral-900 text-sm">
                                {item.cost_per_visit_formatted}
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-neutral-400 italic">
                                {item.cost_per_visit_formatted}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-neutral-200 bg-[#FAFAF9] font-bold text-xs">
                      <td className="py-3.5 px-4 text-neutral-900 uppercase font-mono text-[11px]">
                        Pipeline Total
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-900">
                        {summary.total_leads}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-900">
                        ₹{summary.total_spend.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-900">
                        {summary.total_visits}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-900">
                        {metrics.lead_to_visit_conversion.formatted}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-neutral-900 text-sm">
                        {metrics.blended_cost_per_visit.formatted}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* CONVERSION FUNNEL & ACQUISITION METRICS VISUALIZATION                     */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Pipeline Stage Funnel */}
              <div className="border border-neutral-200 rounded-xl bg-white p-6 shadow-sm space-y-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
                    Pipeline Trajectory
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 mt-0.5">
                    Lead-to-Visit Conversion Funnel
                  </h3>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Step 1: Inquiries */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-800">1. Raw Inquiries Logged</span>
                      <span className="font-mono text-neutral-600">{summary.total_leads} (100%)</span>
                    </div>
                    <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-neutral-900 h-full rounded-full w-full" />
                    </div>
                  </div>

                  {/* Step 2: Goal Extracted (BHK + Budget) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-800">2. Qualified Requirements (BHK & Budget)</span>
                      <span className="font-mono text-neutral-600">
                        {data.lead_audit_records.filter((l) => l.preferred_bhk && l.budget).length} (
                        {Math.round(
                          (data.lead_audit_records.filter((l) => l.preferred_bhk && l.budget).length / summary.total_leads) * 100
                        )}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-neutral-700 h-full rounded-full"
                        style={{
                          width: `${Math.round(
                            (data.lead_audit_records.filter((l) => l.preferred_bhk && l.budget).length / summary.total_leads) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Step 3: Site Visits Booked/Visited */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-800">3. Site Visit Confirmed / Visited</span>
                      <span className="font-mono text-neutral-900 font-bold">
                        {summary.total_visits} ({metrics.lead_to_visit_conversion.formatted})
                      </span>
                    </div>
                    <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-neutral-900 h-full rounded-full"
                        style={{ width: `${metrics.lead_to_visit_conversion.rate_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 text-[11px] text-neutral-500 leading-relaxed">
                  Autonomous AI goal extraction accelerates buyers from inquiry to visit calendar, sustaining a <strong>{metrics.lead_to_visit_conversion.formatted}</strong> conversion rate.
                </div>
              </div>

              {/* Source ROI Card */}
              <div className="border border-neutral-200 rounded-xl bg-white p-6 shadow-sm space-y-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
                    Capital Allocation & Efficiency
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 mt-0.5">
                    Acquisition Channel Cost Comparison
                  </h3>
                </div>

                <div className="space-y-3 pt-2">
                  {metrics.cost_per_visit_segmented.map((src) => (
                    <div key={src.source} className="p-3 rounded-lg border border-neutral-200/80 bg-[#FAFAF9] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-neutral-900">{src.source}</div>
                        <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                          {src.lead_count} leads &middot; ₹{src.total_spend.toLocaleString('en-IN')} spend
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-neutral-900 font-mono">
                          {src.cost_per_visit_formatted}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {src.visits_count} visits converted
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* LEAD-LEVEL SLA & RESPONSE AUDIT TABLE                                     */}
            {/* ========================================================================= */}
            <div className="border border-neutral-200 rounded-xl bg-white shadow-sm overflow-hidden p-6 space-y-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
                  Granular Operational Audit
                </div>
                <h3 className="text-base font-bold text-neutral-900 mt-0.5">
                  Individual Lead Response Time & 48h SLA Audit
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Verification of first touchpoint response duration and 48-hour reach compliance per buyer.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-[#FAFAF9] text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                      <th className="py-3 px-4">Lead ID</th>
                      <th className="py-3 px-4">Buyer Name</th>
                      <th className="py-3 px-4">Source Tag</th>
                      <th className="py-3 px-4">Requirements</th>
                      <th className="py-3 px-4">First Response</th>
                      <th className="py-3 px-4">48h SLA Status</th>
                      <th className="py-3 px-4 text-right">Site Visit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-sans">
                    {data.lead_audit_records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-neutral-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                          #{rec.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-neutral-900">{rec.name}</div>
                          <div className="text-[11px] font-mono text-neutral-400">{rec.phone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded border border-neutral-200 bg-neutral-100 text-neutral-700 font-mono text-[10px] uppercase">
                            {rec.source_tag}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-700">
                          {rec.preferred_bhk} &middot; {rec.budget}
                        </td>
                        <td className="py-3 px-4 font-mono text-neutral-800">
                          {rec.first_response_minutes !== null ? (
                            <span className={rec.first_response_minutes <= 5 ? 'text-emerald-700 font-medium' : 'text-amber-700'}>
                              {rec.first_response_minutes}m
                            </span>
                          ) : (
                            <span className="text-neutral-400 italic">Pending</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {rec.is_unreached_in_48h ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              <AlertTriangle className="w-3 h-3" />
                              Unreached &gt; 48h
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                              <CheckCircle2 className="w-3 h-3 text-neutral-700" />
                              Reached Within SLA
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {rec.has_visit ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Visit Converted ({rec.status})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                              {rec.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

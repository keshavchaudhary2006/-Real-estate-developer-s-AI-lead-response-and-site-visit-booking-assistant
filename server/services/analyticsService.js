const db = require('../../db');
const leadService = require('./leadService');
const inboxService = require('./inboxService');

const COST_PER_LEAD = 1000; // Mandatory constraint: assuming ₹1,000 per lead

/**
 * Calculates high-level performance metrics for the Sales Head:
 * 1. Median first response time (target < 5 mins)
 * 2. Percentage of leads not reached in 48 hours
 * 3. Lead-to-visit conversion rate
 * 4. Cost-per-visit segmented by source (assuming ₹1000 per lead)
 */
async function getPerformanceMetrics(mockNow = null) {
  const leads = await leadService.getAllLeads();
  const now = mockNow ? new Date(mockNow) : new Date();

  // 1. Gather transcript data for each lead to compute first response time & reach status
  const leadAnalytics = await Promise.all(
    leads.map(async (lead) => {
      const transcript = await inboxService.getLeadTranscript(lead.id);
      const createdAt = new Date(lead.created_at);

      // Find first response (assistant or executive message after inquiry)
      const firstResponse = transcript.find(
        (m) => (m.sender === 'assistant' || m.sender === 'executive') && new Date(m.created_at) >= createdAt
      );

      let firstResponseMinutes = null;
      if (firstResponse) {
        const diffMs = new Date(firstResponse.created_at).getTime() - createdAt.getTime();
        firstResponseMinutes = Math.max(0.1, Number((diffMs / 60000).toFixed(1)));
      } else if (lead.updated_at && lead.updated_at !== lead.created_at) {
        const diffMs = new Date(lead.updated_at).getTime() - createdAt.getTime();
        firstResponseMinutes = Math.max(0.1, Number((diffMs / 60000).toFixed(1)));
      }

      // 48-Hour Reach Status:
      // Lead is unreached if:
      // - More than 48 hours have elapsed since inquiry creation, AND
      // - No response was made, or first response took > 48 hours (2880 mins), or lead status remains cold/unreached
      const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      const isOver48HoursOld = ageHours >= 48;
      
      let reachedWithin48Hours = true;
      if (firstResponseMinutes !== null) {
        reachedWithin48Hours = firstResponseMinutes <= 48 * 60; // reached within 2880 mins
      } else if (isOver48HoursOld) {
        reachedWithin48Hours = false;
      }

      const isUnreachedIn48Hours = isOver48HoursOld && !reachedWithin48Hours;

      // Visit Status: has the lead converted to a site visit?
      const statusLower = (lead.status || '').toLowerCase();
      const hasVisit =
        Boolean(lead.slot_id) ||
        statusLower === 'booked' ||
        statusLower === 'visited' ||
        statusLower.includes('visit');

      const sourceTag = inboxService.getSourceTag(lead.source);

      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        source_tag: sourceTag,
        preferred_bhk: lead.preferred_bhk,
        budget: lead.budget,
        status: lead.status,
        created_at: lead.created_at,
        first_response_minutes: firstResponseMinutes,
        age_hours: Number(ageHours.toFixed(1)),
        is_unreached_in_48h: isUnreachedIn48Hours,
        has_visit: hasVisit,
      };
    })
  );

  const totalLeads = leadAnalytics.length;

  // -------------------------------------------------------------
  // METRIC 1: Median First Response Time (target < 5 mins)
  // -------------------------------------------------------------
  const validResponseTimes = leadAnalytics
    .map((l) => l.first_response_minutes)
    .filter((t) => t !== null && !isNaN(t))
    .sort((a, b) => a - b);

  let medianFirstResponseMinutes = 0;
  if (validResponseTimes.length > 0) {
    const mid = Math.floor(validResponseTimes.length / 2);
    if (validResponseTimes.length % 2 !== 0) {
      medianFirstResponseMinutes = validResponseTimes[mid];
    } else {
      medianFirstResponseMinutes = Number(((validResponseTimes[mid - 1] + validResponseTimes[mid]) / 2).toFixed(1));
    }
  }

  const responseTargetMinutes = 5.0;
  const isWithinResponseTarget = medianFirstResponseMinutes <= responseTargetMinutes;
  const responseVariancePercent = Number(
    (((medianFirstResponseMinutes - responseTargetMinutes) / responseTargetMinutes) * 100).toFixed(1)
  );

  // -------------------------------------------------------------
  // METRIC 2: Percentage of leads not reached in 48 hours
  // -------------------------------------------------------------
  const unreachedLeadsCount = leadAnalytics.filter((l) => l.is_unreached_in_48h).length;
  const unreachedPercentage = totalLeads > 0
    ? Number(((unreachedLeadsCount / totalLeads) * 100).toFixed(1))
    : 0;

  // -------------------------------------------------------------
  // METRIC 3: Lead-to-visit conversion rate
  // -------------------------------------------------------------
  const visitLeadsCount = leadAnalytics.filter((l) => l.has_visit).length;
  const leadToVisitConversionRate = totalLeads > 0
    ? Number(((visitLeadsCount / totalLeads) * 100).toFixed(1))
    : 0;

  // -------------------------------------------------------------
  // METRIC 4: Cost-per-visit segmented by source (assuming ₹1000/lead)
  // -------------------------------------------------------------
  const sources = ['Portal', 'Ads', 'Hoarding', 'Direct'];
  const segmentedCostPerVisit = sources.map((src) => {
    const srcLeads = leadAnalytics.filter((l) => l.source_tag === src);
    const leadCount = srcLeads.length;
    const totalSpend = leadCount * COST_PER_LEAD;
    const visitsCount = srcLeads.filter((l) => l.has_visit).length;
    const conversionRate = leadCount > 0 ? Number(((visitsCount / leadCount) * 100).toFixed(1)) : 0;
    
    // Cost per visit: Total Spend / Visits Count
    const costPerVisit = visitsCount > 0 ? Math.round(totalSpend / visitsCount) : null;

    return {
      source: src,
      lead_count: leadCount,
      total_spend: totalSpend,
      visits_count: visitsCount,
      conversion_rate: conversionRate,
      cost_per_visit: costPerVisit, // null if 0 visits
      cost_per_visit_formatted: costPerVisit ? `₹${costPerVisit.toLocaleString('en-IN')}` : 'N/A (0 visits)',
    };
  });

  // Overall blended cost per visit
  const totalSpendAll = totalLeads * COST_PER_LEAD;
  const blendedCostPerVisit = visitLeadsCount > 0 ? Math.round(totalSpendAll / visitLeadsCount) : null;

  return {
    success: true,
    timestamp: now.toISOString(),
    summary: {
      total_leads: totalLeads,
      cost_per_lead_assumption: COST_PER_LEAD,
      total_spend: totalSpendAll,
      total_visits: visitLeadsCount,
    },
    metrics: {
      // Metric 1: Median first response time
      median_first_response_time: {
        value_minutes: medianFirstResponseMinutes,
        formatted: `${medianFirstResponseMinutes} mins`,
        target_minutes: responseTargetMinutes,
        target_formatted: '< 5 mins',
        is_target_met: isWithinResponseTarget,
        variance_percent: responseVariancePercent,
        sampled_leads_count: validResponseTimes.length,
      },
      // Metric 2: Percentage of leads not reached in 48 hours
      unreached_in_48h: {
        percentage: unreachedPercentage,
        formatted: `${unreachedPercentage}%`,
        unreached_count: unreachedLeadsCount,
        total_leads: totalLeads,
        is_sla_healthy: unreachedPercentage <= 10.0,
      },
      // Metric 3: Lead-to-visit conversion rate
      lead_to_visit_conversion: {
        rate_percentage: leadToVisitConversionRate,
        formatted: `${leadToVisitConversionRate}%`,
        visits_count: visitLeadsCount,
        total_leads: totalLeads,
      },
      // Metric 4: Cost-per-visit segmented by source
      cost_per_visit_segmented: segmentedCostPerVisit,
      blended_cost_per_visit: {
        value: blendedCostPerVisit,
        formatted: blendedCostPerVisit ? `₹${blendedCostPerVisit.toLocaleString('en-IN')}` : 'N/A',
      },
    },
    lead_audit_records: leadAnalytics,
  };
}

module.exports = {
  COST_PER_LEAD,
  getPerformanceMetrics,
};

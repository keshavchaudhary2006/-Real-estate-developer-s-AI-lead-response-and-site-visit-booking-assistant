const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');

/**
 * GET /api/analytics/performance
 * High-level performance metrics for Sales Head:
 * 1. Median first response time (target < 5 mins)
 * 2. Percentage of leads not reached in 48 hours
 * 3. Lead-to-visit conversion rate
 * 4. Cost-per-visit segmented by source (assuming ₹1000/lead)
 */
router.get('/performance', async (req, res) => {
  try {
    const mockNow = req.query.mockNow || null;
    const metrics = await analyticsService.getPerformanceMetrics(mockNow);
    res.json(metrics);
  } catch (error) {
    console.error('Analytics performance metrics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

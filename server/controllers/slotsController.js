const slotsService = require('../services/slotsService');

/**
 * GET /api/slots
 * Query params: project_id, is_booked
 */
async function getAllSlots(req, res) {
  try {
    const filters = {
      project_id: req.query.project_id,
      is_booked: req.query.is_booked,
    };
    const slots = await slotsService.getAllSlots(filters);
    res.json({ success: true, count: slots.length, data: slots });
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/slots/available
 * Returns ONLY unbooked and currently unlocked slots
 */
async function getAvailableSlots(req, res) {
  try {
    const filters = {
      project_id: req.query.project_id,
    };
    const slots = await slotsService.getAvailableSlots(filters);
    res.json({ success: true, count: slots.length, data: slots });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/slots/:id
 */
async function getSlotById(req, res) {
  try {
    const slot = await slotsService.getSlotById(req.params.id);
    if (!slot) {
      return res.status(404).json({ success: false, error: 'VisitSlot not found.' });
    }
    res.json({ success: true, data: slot });
  } catch (error) {
    console.error('Error fetching slot by ID:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/slots
 */
async function createSlot(req, res) {
  try {
    const newSlot = await slotsService.createSlot(req.body);
    res.status(201).json({
      success: true,
      message: 'Visit slot created successfully.',
      data: newSlot,
    });
  } catch (error) {
    console.error('Error creating visit slot:', error);
    res.status(400).json({ success: false, error: error.message });
  }
}

/**
 * PUT or PATCH /api/slots/:id
 */
async function updateSlot(req, res) {
  try {
    const updated = await slotsService.updateSlot(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'VisitSlot not found.' });
    }
    res.json({
      success: true,
      message: 'Visit slot updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating slot:', error);
    res.status(400).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/slots/:id/lock
 * CRITICAL CONSTRAINT: Applies 2-minute lock to prevent double booking
 * Body: { durationMinutes: 2 }
 */
async function lockSlot(req, res) {
  try {
    const duration = req.body.durationMinutes ? parseInt(req.body.durationMinutes, 10) : 2;
    const lockResult = await slotsService.lockSlot(req.params.id, duration);
    res.json(lockResult);
  } catch (error) {
    console.error('Error locking slot:', error);
    res.status(409).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/slots/:id/unlock
 */
async function unlockSlot(req, res) {
  try {
    const released = await slotsService.releaseLock(req.params.id);
    res.json({ success: true, message: 'Lock released.', data: released });
  } catch (error) {
    console.error('Error releasing slot lock:', error);
    res.status(400).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/slots/:id/book
 * Confirms booking on a locked slot -> updates status to booked
 * Body: { name, phone, preferred_bhk, budget }
 */
async function confirmBooking(req, res) {
  try {
    const bookingResult = await slotsService.confirmBooking(req.params.id, req.body);
    res.json(bookingResult);
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(400).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/slots/:id
 */
async function deleteSlot(req, res) {
  try {
    const success = await slotsService.deleteSlot(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'VisitSlot not found.' });
    }
    res.json({
      success: true,
      message: `VisitSlot #${req.params.id} deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting slot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getAllSlots,
  getAvailableSlots,
  getSlotById,
  createSlot,
  updateSlot,
  lockSlot,
  unlockSlot,
  confirmBooking,
  deleteSlot,
};

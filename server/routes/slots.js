const express = require('express');
const router = express.Router();
const slotsController = require('../controllers/slotsController');

// Available slots for calendar UI (filters out booked & locked)
router.get('/available', slotsController.getAvailableSlots);

// Standard CRUD endpoints for VisitSlots
router.get('/', slotsController.getAllSlots);
router.post('/', slotsController.createSlot);
router.get('/:id', slotsController.getSlotById);
router.put('/:id', slotsController.updateSlot);
router.patch('/:id', slotsController.updateSlot);
router.delete('/:id', slotsController.deleteSlot);

// 2-minute lock, unlock & confirmation booking endpoints
router.post('/:id/lock', slotsController.lockSlot);
router.post('/:id/unlock', slotsController.unlockSlot);
router.post('/:id/book', slotsController.confirmBooking);

module.exports = router;

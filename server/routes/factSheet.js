const express = require('express');
const router = express.Router();
const factSheetController = require('../controllers/factSheetController');

// CRUD endpoints for FactSheet
router.get('/', factSheetController.getAllFactSheets);
router.post('/', factSheetController.createFactSheet);
router.get('/:id', factSheetController.getFactSheetById);
router.put('/:id', factSheetController.updateFactSheet);
router.patch('/:id', factSheetController.updateFactSheet);
router.delete('/:id', factSheetController.deleteFactSheet);

module.exports = router;

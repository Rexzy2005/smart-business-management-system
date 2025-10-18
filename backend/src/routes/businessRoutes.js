const express = require('express');
const businessController = require('../controllers/businessController');
const { protect, authorize } = require('../middleware/auth');
const { preferencesValidation, validate } = require('../middleware/validation');

const router = express.Router();

router.use(protect);

router.get('/profile', businessController.getProfile);
router.put('/profile', authorize('owner'), businessController.updateProfile);

router.get('/preferences', businessController.getPreferences);
router.put(
  '/preferences',
  authorize('owner'),
  preferencesValidation,
  validate,
  businessController.updatePreferences
);

module.exports = router;
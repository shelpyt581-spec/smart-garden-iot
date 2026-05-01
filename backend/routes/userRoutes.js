const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, deleteSavedCard } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

router.delete('/profile/cards/:cardId', protect, deleteSavedCard);

module.exports = router;

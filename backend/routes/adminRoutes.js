const express = require('express');
const router = express.Router();
const { getAdminStats, scanTicket, getUsers, toggleBlockUser, resetOccupancy } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/stats', protect, admin, getAdminStats);
router.post('/scan', protect, admin, scanTicket);
router.post('/reset-occupancy', protect, admin, resetOccupancy);
router.get('/users', protect, admin, getUsers);
router.patch('/users/:id/block', protect, admin, toggleBlockUser);

module.exports = router;

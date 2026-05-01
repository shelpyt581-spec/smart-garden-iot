const express = require('express');
const router = express.Router();
const { checkout, getTicketHistory } = require('../controllers/ticketController');
const { protect } = require('../middleware/authMiddleware');

router.post('/checkout', protect, checkout);
router.get('/history', protect, getTicketHistory);

module.exports = router;

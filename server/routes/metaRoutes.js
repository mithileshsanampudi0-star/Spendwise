const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { INCOME_SOURCES, PAYMENT_METHODS } = require('../utils/constants');

router.get('/', protect, (_req, res) => res.json({ success: true, data: { incomeSources: INCOME_SOURCES, paymentMethods: PAYMENT_METHODS } }));

module.exports = router;

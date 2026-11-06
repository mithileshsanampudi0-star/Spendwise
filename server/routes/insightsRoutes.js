const router = require('express').Router();
const ctrl = require('../controllers/insightsController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.get);

module.exports = router;

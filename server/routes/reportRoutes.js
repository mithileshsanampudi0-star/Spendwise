const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/monthly', ctrl.monthly);

module.exports = router;

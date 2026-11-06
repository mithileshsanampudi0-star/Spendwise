const router = require('express').Router();
const ctrl = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/summary', ctrl.summary);
router.get('/categories', ctrl.categories);
router.get('/trends', ctrl.trends);
router.get('/comparison', ctrl.comparison);
router.get('/cashflow', ctrl.cashflow);
router.get('/forecast', ctrl.forecast);
router.get('/health', ctrl.health);
router.get('/heatmap', ctrl.heatmap);

module.exports = router;

const router = require('express').Router();
const ctrl = require('../controllers/backupController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.exportJson);
router.get('/transactions.csv', ctrl.exportCsv);

module.exports = router;

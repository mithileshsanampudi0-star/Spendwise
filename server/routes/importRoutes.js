const router = require('express').Router();
const ctrl = require('../controllers/importController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/quick', ctrl.quick);
router.post('/preview', ctrl.preview);
router.post('/commit', ctrl.commit);

module.exports = router;

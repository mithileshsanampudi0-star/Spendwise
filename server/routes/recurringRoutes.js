const router = require('express').Router();
const ctrl = require('../controllers/recurringController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/detected', ctrl.detected);
router.post('/run', ctrl.run);
router.route('/').get(ctrl.list).post(ctrl.create);
router.route('/:id').put(ctrl.update).delete(ctrl.remove);

module.exports = router;

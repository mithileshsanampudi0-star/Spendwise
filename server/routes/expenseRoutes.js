const router = require('express').Router();
const ctrl = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.route('/').get(ctrl.list).post(ctrl.create);
router.post('/:id/restore', ctrl.restore);
router.route('/:id').get(ctrl.getOne).put(ctrl.update).delete(ctrl.remove);

module.exports = router;

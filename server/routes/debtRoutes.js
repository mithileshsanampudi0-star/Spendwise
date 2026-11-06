const router = require('express').Router();
const ctrl = require('../controllers/debtController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.route('/').get(ctrl.list).post(ctrl.create);
router.route('/:id').put(ctrl.update).delete(ctrl.remove);
router.post('/:id/payments', ctrl.addPayment);
router.delete('/:id/payments/:paymentId', ctrl.removePayment);

module.exports = router;

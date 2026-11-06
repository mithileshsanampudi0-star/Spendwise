const router = require('express').Router();
const ctrl = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.route('/').get(ctrl.list).post(ctrl.create);
router.route('/:id').put(ctrl.update).delete(ctrl.remove);

module.exports = router;

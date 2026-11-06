const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginLimiter, registerLimiter, demoLimiter, forgotLimiter } = require('../middleware/security');

router.post('/register', registerLimiter, ctrl.register);
router.post('/login', loginLimiter, ctrl.login);
router.post('/demo', demoLimiter, ctrl.demo);
router.post('/logout', ctrl.logout);
router.post('/forgot-password', forgotLimiter, ctrl.forgot);
router.post('/reset-password', forgotLimiter, ctrl.reset);
router.get('/me', protect, ctrl.me);
router.put('/me', protect, ctrl.updateProfile);
router.put('/password', protect, ctrl.changePassword);

module.exports = router;

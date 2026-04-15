const express = require('express');
const { register, login, forgotPassword, inviteUser, registerWithInvite, changePassword } = require('../controllers/auth');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/invite', inviteUser);
router.post('/register-invite', registerWithInvite);
router.patch('/password', changePassword);

module.exports = router;

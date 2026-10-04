const express = require('express');
const { registerUser, loginUser, getProfile, updateProfile } = require('./controllers');
const { verifyJWT, limiter, csrfProtection } = require('./middleware');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', limiter, loginUser);
router.get('/profile', verifyJWT, getProfile);
router.put('/profile', verifyJWT, csrfProtection, updateProfile);

module.exports = router;

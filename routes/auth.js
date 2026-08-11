const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User'); 
const auth = require('../middleware/authMiddleware');

// ----------------------------------------------------
// 1. REGISTER ROUTE (Naya Account Banane Ke Liye)
// ----------------------------------------------------
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists!' });
        }

        user = new User({ name, email, password });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, msg: "Welcome to Coinzaar! Registration successful." });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ----------------------------------------------------
// 2. LOGIN ROUTE (Account Mein Entry Lene Ke Liye)
// ----------------------------------------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check karein ki user ka email database mein hai ya nahi
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials (Email nahi mila)' });
        }

        // Check karein ki password match ho raha hai ya nahi
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials (Password galat hai)' });
        }

        // Agar sab sahi hai toh Token dekar andar aane dein
        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, msg: "Login Successful! Welcome back. 🚀" });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ----------------------------------------------------
// 3. GET USER PROFILE & BALANCE (Secure Route)
// ----------------------------------------------------
router.get('/user', auth, async (req, res) => {
    try {
        // Token se ID lekar database se user dhoondhna, par password chupa lena (-password)
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
module.exports = router;
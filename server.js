const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load .env variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Database
connectDB(); 

// API Routes
app.use('/api/auth', require('./routes/auth'));

app.get('/', (req, res) => {
    res.send('Coinzaar Exchange Backend is Live and Connected to DB! 🚀');
});

// --- ADD FUNDS API ---
app.post('/api/auth/add-funds', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const mongoose = require('mongoose');
    
    // 1. User ka token check karein
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    // 2. Token se user ki ID nikalein
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret'); // Agar .env mein JWT_SECRET alag hai toh wo use hoga
    const userId = decoded.user ? decoded.user.id : decoded.id;

    // 3. Database mein User dhoondhein aur Balance badhayein
    const User = mongoose.model('User'); 
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Wallet mein ₹50,000 add kar rahe hain
    user.fiatBalance = (user.fiatBalance || 0) + 50000; 
    await user.save();

    res.json(user); // Naya balance frontend ko bhej dein
  } catch (err) {
    console.error("Add Funds Error:", err.message);
    res.status(500).send('Server Error');
  }
});
// --- BUY CRYPTO API ---
app.post('/api/auth/buy', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const mongoose = require('mongoose');
    
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const userId = decoded.user ? decoded.user.id : decoded.id;

    const User = mongoose.model('User'); 
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const { coinName, symbol, price, investAmount } = req.body;

    // Check karein ki user ke paas paise hain ya nahi
    if (user.fiatBalance < investAmount) {
      return res.status(400).json({ msg: 'Insufficient Balance! Paise add karein.' });
    }

    // 1. Paise (INR) katein
    user.fiatBalance -= investAmount;

    // 2. Crypto kitna aayega wo calculate karein (Amount / Current Price)
    const cryptoAmount = investAmount / price;

    // 3. User ke portfolio mein Crypto add karein
    if (!user.portfolio) user.portfolio = {};
    user.portfolio[symbol] = (user.portfolio[symbol] || 0) + cryptoAmount;

    // Database ko batayein ki portfolio update hua hai
    user.markModified('portfolio'); 
    await user.save();

    res.json(user);
  } catch (err) {
    console.error("Buy Error:", err.message);
    res.status(500).send('Server Error');
  }
});

// --- SELL CRYPTO API ---
app.post('/api/auth/sell', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const mongoose = require('mongoose');
    
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const userId = decoded.user ? decoded.user.id : decoded.id;

    const User = mongoose.model('User'); 
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const { symbol, price, sellAmount } = req.body;

    if (!user.portfolio || !user.portfolio[symbol] || user.portfolio[symbol] < sellAmount) {
      return res.status(400).json({ msg: 'Aapke pas bechne ke liye itna crypto nahi hai!' });
    }

    user.portfolio[symbol] -= sellAmount;

    if (user.portfolio[symbol] <= 0) {
      delete user.portfolio[symbol];
    }

    const returnInr = sellAmount * price;
    user.fiatBalance += returnInr;

    user.markModified('portfolio'); 
    await user.save();

    res.json(user);
  } catch (err) {
    console.error("Sell Error:", err.message);
    res.status(500).send('Server Error');
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Coinzaar Backend is running on port ${PORT} 🚀`);
});
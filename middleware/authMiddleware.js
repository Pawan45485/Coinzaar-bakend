const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // 1. Header se token nikalna
    const token = req.header('x-auth-token');

    // 2. Agar token nahi hai toh entry band
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied (Aapke paas pass nahi hai)' });
    }

    // 3. Token check karna ki asli hai ya nakli
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next(); // Sab theek hai, aage jane do
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid (Token galat hai)' });
    }
};
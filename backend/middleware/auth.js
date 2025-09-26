const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Auth middleware - Token present:', !!token);
    
    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log('Auth middleware - User not found for token');
      return res.status(401).json({ error: 'Invalid token.' });
    }

    console.log('Auth middleware - User authenticated:', user.name, user.department);
    req.user = user;
    next();
  } catch (error) {
    console.log('Auth middleware - Token verification failed:', error.message);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = auth;

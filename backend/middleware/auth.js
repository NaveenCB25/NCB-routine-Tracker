const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_super_secret_jwt_key_123';

function authMiddleware(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No authentication token, access denied' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified; // { userId: ..., name: ..., email: ... }
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token verification failed, authorization denied' });
  }
}

module.exports = authMiddleware;

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Simple admin credentials (production mein DB mein store karo)
const ADMIN = {
  email: 'admin@veriscan.com',
  password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.' // 'password'
};

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (email !== ADMIN.email) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const valid = await bcrypt.compare(password, ADMIN.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  
  const token = jwt.sign({ email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token });
});

module.exports = router;
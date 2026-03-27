const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS - Frontend ko allow karo
app.use(cors({
  origin: ['https://veriscan-main.vercel.app', 'https://veriscan-admin.vercel.app', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// MongoDB Connect
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// Routes
app.use('/api/upload', require('./routes/upload'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/auth', require('./routes/auth'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'VeriScan Backend Running! 🚀' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
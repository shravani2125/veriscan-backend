const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Same Document model use karo
const Document = mongoose.model('Document');

// Sabhi submissions dekho
router.get('/submissions', async (req, res) => {
  try {
    const docs = await Document.find().sort({ createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ek submission ka detail
router.get('/submission/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin - Approve ya Reject karo
router.patch('/submission/:id/status', async (req, res) => {
  try {
    const { status, adminComment } = req.body;
    
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { status, adminComment },
      { new: true }
    );

    res.json({ success: true, data: doc, message: `Status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats for admin dashboard
router.get('/stats', async (req, res) => {
  try {
    const total = await Document.countDocuments();
    const pending = await Document.countDocuments({ status: 'pending' });
    const approved = await Document.countDocuments({ status: 'approved' });
    const rejected = await Document.countDocuments({ status: 'rejected' });
    
    res.json({ success: true, stats: { total, pending, approved, rejected } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
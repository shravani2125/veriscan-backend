const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  type: String,        // 'aadhaar', 'pan', 'driving_license', etc.
  filename: String,
  extractedText: String,
  extractedData: Object  // name, dob, number etc.
});

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  userEmail: String,
  submissionId: { type: String, unique: true },
  
  documents: [documentSchema],
  
  // AI Results
  aiAnalysis: {
    isSamePerson: Boolean,
    isAllAuthentic: Boolean,
    confidenceScore: Number,    // 0-100
    documentResults: [{
      type: String,
      isReal: Boolean,
      confidence: Number,
      issues: [String],
      extractedName: String
    }],
    overallVerdict: String,     // 'LIKELY_REAL', 'SUSPICIOUS', 'LIKELY_FAKE'
    reasoning: String
  },
  
  // Admin Decision
  status: { 
    type: String, 
    default: 'pending',
    enum: ['pending', 'approved', 'rejected']
  },
  adminNote: String,
  reviewedAt: Date,
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', submissionSchema);
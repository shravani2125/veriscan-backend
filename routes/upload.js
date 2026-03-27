const express = require('express');
const router = express.Router();
const multer = require('multer');
const Tesseract = require('tesseract.js');
const Anthropic = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Anthropic Client
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Upload folder banao
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer Setup - File save karo
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// MongoDB Schema - Document ka structure
const DocumentSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  userEmail: String,
  documents: [{
    type: String,        // 'aadhar', 'pan', 'driving_license', etc.
    filename: String,
    extractedText: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  aiAnalysis: {
    isReal: Boolean,
    isSamePerson: Boolean,
    confidenceScore: Number,
    documentTypes: [String],
    nameFound: String,
    issues: [String],
    details: String
  },
  status: { type: String, default: 'pending' }, // pending, approved, rejected
  adminComment: String,
  createdAt: { type: Date, default: Date.now }
});

const Document = mongoose.model('Document', DocumentSchema);

// 🚀 MAIN ROUTE - Multiple documents upload
router.post('/', upload.array('documents', 5), async (req, res) => {
  try {
    const { userName, userEmail, userId } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Koi file upload nahi ki!' });
    }

    console.log(`📄 ${files.length} files upload ho rahe hain...`);

    // Step 1: OCR - Har file se text nikalo
    const extractedDocs = [];
    for (const file of files) {
      console.log(`🔍 OCR chal raha hai: ${file.originalname}`);
      
      const { data: { text } } = await Tesseract.recognize(file.path, 'eng+hin', {
        logger: m => {} // quiet mode
      });

      // Document type detect karo
      const docType = detectDocumentType(text, file.originalname);
      
      extractedDocs.push({
        type: docType,
        filename: file.filename,
        extractedText: text.trim()
      });

      console.log(`✅ OCR done: ${file.originalname} → Type: ${docType}`);
    }

    // Step 2: AI Analysis - Claude se check karwao
    console.log('🤖 AI analysis shuru...');
    const aiResult = await analyzeWithAI(extractedDocs, userName);

    // Step 3: MongoDB mein save karo
    const newDoc = new Document({
      userId: userId || 'guest_' + Date.now(),
      userName,
      userEmail,
      documents: extractedDocs,
      aiAnalysis: aiResult,
      status: 'pending'
    });

    await newDoc.save();
    console.log('💾 Database mein save ho gaya!');

    // Frontend ko response do
    res.json({
      success: true,
      message: 'Documents successfully upload aur analyze ho gaye!',
      submissionId: newDoc._id,
      analysis: {
        confidenceScore: aiResult.confidenceScore,
        isReal: aiResult.isReal,
        isSamePerson: aiResult.isSamePerson,
        documentTypes: aiResult.documentTypes,
        summary: aiResult.details
      }
    });

  } catch (error) {
    console.error('❌ Upload Error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Document type detect karna
function detectDocumentType(text, filename) {
  const textLower = text.toLowerCase();
  const fileLower = filename.toLowerCase();
  
  if (textLower.includes('aadhaar') || textLower.includes('aadhar') || textLower.includes('uidai')) return 'aadhar';
  if (textLower.includes('permanent account number') || textLower.includes('income tax')) return 'pan';
  if (textLower.includes('driving licence') || textLower.includes('motor vehicles')) return 'driving_license';
  if (textLower.includes('electricity') || textLower.includes('bijli') || textLower.includes('kwh')) return 'electricity_bill';
  if (textLower.includes('passbook') || textLower.includes('bank') || textLower.includes('account no')) return 'passbook';
  
  // Filename se guess karo
  if (fileLower.includes('aadhar') || fileLower.includes('aadhaar')) return 'aadhar';
  if (fileLower.includes('pan')) return 'pan';
  
  return 'unknown';
}

// AI Analysis Function
async function analyzeWithAI(documents, userName) {
  const docsText = documents.map((doc, i) => 
    `Document ${i+1} (Type: ${doc.type}):\n${doc.extractedText.substring(0, 1000)}`
  ).join('\n\n---\n\n');

  const prompt = `You are a document verification AI for Indian documents. Analyze these documents and respond ONLY in this exact JSON format:

{
  "isReal": true/false,
  "isSamePerson": true/false,
  "confidenceScore": 0-100,
  "documentTypes": ["list", "of", "detected", "types"],
  "nameFound": "name extracted from documents",
  "issues": ["list any problems found"],
  "details": "Brief explanation in simple English"
}

Documents to analyze:
${docsText}

User claimed name: ${userName || 'Not provided'}

Check:
1. Are these real Indian documents (Aadhar, PAN, Driving License, Electricity Bill, Passbook)?
2. Do all documents belong to the same person?
3. Are there signs of tampering or fakeness?
4. Does name on documents match claimed name?

Respond ONLY with JSON, no other text.`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error('AI Error:', err);
  }

  // Fallback if AI fails
  return {
    isReal: false,
    isSamePerson: false,
    confidenceScore: 0,
    documentTypes: documents.map(d => d.type),
    nameFound: 'Unknown',
    issues: ['AI analysis failed'],
    details: 'Manual review required'
  };
}

module.exports = router;
module.exports.Document = Document;
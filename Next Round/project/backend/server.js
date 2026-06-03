require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const PDFParser = require('pdf2json');
const cors = require('cors');
const Groq = require('groq-sdk');
const Interview = require('./models/InterviewModel');

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected ✅'))
  .catch(err => console.log('MongoDB error:', err));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    console.log("Request received ✅");
    console.log("File:", req.file ? req.file.originalname : "No file ❌");

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const resumeText = await new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(null, 1);
      
      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        try {
          const text = pdfData.Pages.map(page => 
            page.Texts.map(t => decodeURIComponent(t.R[0].T)).join(' ')
          ).join(' ');
          console.log("Text extracted, length:", text.length);
          resolve(text);
        } catch(e) {
          reject(e);
        }
      });
      
      pdfParser.on('pdfParser_dataError', (err) => {
        console.log("PDF parse error:", err);
        reject(new Error(err.parserError || 'PDF parse failed'));
      });
      
      pdfParser.parseBuffer(req.file.buffer);
    });

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ error: "Couldn't read PDF. Try a different file." });
    }

    const prompt = `
First check if this is a resume/CV document.
If it is NOT a resume, return exactly: {"error":"not_a_resume"}
If it IS a resume, return ONLY this JSON with no extra text:
{"skills":["skill1"],"experience":["Company - Role - Duration"],"projects":["Project - Description"],"education":["Degree - College - Year"]}

Document:
${resumeText}
`;

    const result = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }]
    });

    const response = result.choices[0].message.content;
    console.log("Groq response:", response);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const clean = jsonMatch ? jsonMatch[0] : response;
    const parsed = JSON.parse(clean);

    if (parsed.error === 'not_a_resume') {
      return res.status(400).json({ error: "Couldn't fetch details. Try uploading a resume in PDF format." });
    }

    const suggestionPrompt = `
Analyze this resume and return ONLY this JSON with no extra text:
{"score":75,"strengths":["strength1"],"weaknesses":["weakness1"],"improvements":["improvement1"]}

Resume:
${resumeText}
`;

    const suggestionResult = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: suggestionPrompt }]
    });

    const suggestionResponse = suggestionResult.choices[0].message.content;
    console.log("Suggestion response:", suggestionResponse);
    const suggestionMatch = suggestionResponse.match(/\{[\s\S]*\}/);
    const suggestions = JSON.parse(suggestionMatch[0]);

    parsed.suggestions = suggestions;
    res.json(parsed);

  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ error: 'Something went wrong: ' + err.message });
  }
});

app.post('/generate-questions', async (req, res) => {
    try {
        const { resumeData } = req.body;
        
        const prompt = `
Based on this resume data, generate exactly 10 interview questions.
Return ONLY a JSON array with no extra text:
["question1", "question2", ..., "question10"]

Mix of:
- Technical questions based on skills
- Project-based questions  
- Behavioral questions
- Experience-based questions

Resume:
Skills: ${resumeData.skills.join(', ')}
Experience: ${resumeData.experience.join(', ')}
Projects: ${resumeData.projects.join(', ')}
Education: ${resumeData.education.join(', ')}
        `;

        const result = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }]
        });

        const response = result.choices[0].message.content;
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        const questions = JSON.parse(jsonMatch[0]);

        res.json({ questions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate questions' });
    }
});

app.listen(5000, () => console.log('Server running on port 5000 ✅'));

app.post('/evaluate', async (req, res) => {
    try {
        const { answers, resumeData } = req.body;

        const prompt = `
You are an expert interview evaluator.
Evaluate these interview answers and return ONLY this JSON with no extra text:
{
  "overallScore": 75,
  "communicationScore": 80,
  "technicalScore": 70,
  "confidenceScore": 75,
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "questionFeedback": [
    {
      "question": "question text",
      "answer": "answer text",
      "score": 7,
      "feedback": "brief feedback"
    }
  ]
}

Resume Skills: ${resumeData.skills.join(', ')}

Interview Q&A:
${answers.map((a, i) => `Q${i+1}: ${a.question}\nA: ${a.answer}`).join('\n\n')}
        `;

        const result = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }]
        });

        const response = result.choices[0].message.content;
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const evaluated = JSON.parse(jsonMatch[0]);

        res.json(evaluated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Evaluation failed' });
    }
});


app.post('/save-interview', async (req, res) => {
    try {
        const { userId, userName, userEmail, resumeData, resumeSuggestions, evaluation } = req.body;

        const interview = new Interview({
            userId,
            userName,
            userEmail,
            resumeData,
            resumeSuggestions,
            evaluation
        });

        await interview.save();
        res.json({ success: true, id: interview._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save interview' });
    }
});

app.get('/history/:userId', async (req, res) => {
    try {
        const interviews = await Interview.find({ userId: req.params.userId })
            .sort({ createdAt: -1 })
            .select('createdAt evaluation.overallScore evaluation.communicationScore evaluation.technicalScore evaluation.confidenceScore resumeSuggestions.score');
        res.json(interviews);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});
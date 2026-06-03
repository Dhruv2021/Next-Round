const mongoose = require('mongoose');

const InterviewSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String },
    userEmail: { type: String },
    resumeData: {
        skills: [String],
        experience: [String],
        projects: [String],
        education: [String]
    },
    resumeSuggestions: {
        score: Number,
        strengths: [String],
        weaknesses: [String],
        improvements: [String]
    },
    evaluation: {
        overallScore: Number,
        communicationScore: Number,
        confidenceScore: Number,
        technicalScore: Number,
        strengths: [String],
        weaknesses: [String],
        improvements: [String],
        questionFeedback: [{
            question: String,
            answer: String,
            score: Number,
            feedback: String
        }]
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports =
  mongoose.models.Interview ||
  mongoose.model('Interview', InterviewSchema);
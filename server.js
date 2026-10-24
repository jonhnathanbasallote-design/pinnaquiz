const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const QUIZZES_FILE = path.join(__dirname, 'quizzes.json');
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');

const readData = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return [];
  }
};

const writeData = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// GET All Quizzes
app.get('/api/quizzes', (req, res) => {
  res.json(readData(QUIZZES_FILE));
});

// POST New Quiz
app.post('/api/quizzes', (req, res) => {
  const newQuiz = req.body;
  const [hours, minutes] = (newQuiz.cutoffTimeStr || "23:59").split(':').map(Number);
  const targetDate = new Date();
  targetDate.setHours(hours, minutes, 0, 0);

  if (targetDate.getTime() <= Date.now()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  newQuiz.globalEndTimeMs = targetDate.getTime();

  const quizzes = readData(QUIZZES_FILE);
  quizzes.push(newQuiz);
  writeData(QUIZZES_FILE, quizzes);
  res.status(201).json({ message: 'Quiz published successfully!', quiz: newQuiz });
});

// GET All Submissions
app.get('/api/submissions', (req, res) => {
  res.json(readData(SUBMISSIONS_FILE));
});

// POST Student Submission
app.post('/api/submissions', (req, res) => {
  const newSubmission = req.body;
  const submissions = readData(SUBMISSIONS_FILE);
  
  const existingIdx = submissions.findIndex(
    s => s.quizId === newSubmission.quizId && s.studentId === newSubmission.studentId
  );

  if (existingIdx !== -1) {
    submissions[existingIdx] = newSubmission;
  } else {
    submissions.push(newSubmission);
  }

  writeData(SUBMISSIONS_FILE, submissions);
  res.status(201).json({ message: 'Submission recorded!' });
});

// PUT Manual Grade Updates (Updates Score & Dynamic Total)
app.put('/api/submissions/grade', (req, res) => {
  const { submissionId, updatedScore, updatedTotal, essayGrades, teacherChecked } = req.body;
  const submissions = readData(SUBMISSIONS_FILE);

  const idx = submissions.findIndex(s => s.id === submissionId);
  if (idx !== -1) {
    submissions[idx].score = updatedScore;
    if (updatedTotal) submissions[idx].total = updatedTotal;
    submissions[idx].essayGrades = essayGrades;
    submissions[idx].teacherChecked = teacherChecked;
    submissions[idx].status = 'Graded';
    writeData(SUBMISSIONS_FILE, submissions);
    return res.json({ message: 'Grades published successfully!' });
  }

  res.status(404).json({ error: 'Submission not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`==================================================`);
  console.log(`🚀 PinnaQuiz Core Engine Active on Port ${PORT}!`);
  console.log(`==================================================`);
});
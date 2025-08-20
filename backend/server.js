const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
// Universal fetch: Node 18+ global fetch, else dynamic import of node-fetch
const _fetch = (typeof fetch === 'function') ? fetch : (url, options) => (
  import('node-fetch').then(({ default: f }) => f(url, options))
);

// Import models (for registration)
require('./models/User');
require('./models/Job');
require('./models/Application');
require('./models/Chat');
require('./models/Message');
require('./models/Saved');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Translation proxy with simple in-memory cache
const translateCache = new Map(); // key -> translated
function makeCacheKey(text, target) {
  const hash = crypto.createHash('sha1').update(text).digest('hex');
  return `${target}:${hash}`;
}

app.post('/api/translate', async (req, res) => {
  try {
    const { text, target } = req.body || {};
    if (!text || !target) return res.status(400).json({ error: 'text and target are required' });
    if (target === 'en') return res.json({ translatedText: text });

    const key = makeCacheKey(text, target);
    if (translateCache.has(key)) {
      return res.json({ translatedText: translateCache.get(key), cached: true });
    }

    // Primary: LibreTranslate (or configured)
    const apiUrl = process.env.TRANSLATE_API_URL || 'https://libretranslate.com/translate';
    const payload = { q: text, source: 'auto', target, format: 'text' };
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.TRANSLATE_API_KEY) headers['x-api-key'] = process.env.TRANSLATE_API_KEY;

    let translatedText = '';
    try {
      const r = await _fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (r.ok) {
        const data = await r.json();
        translatedText = data.translatedText || data.translation || data.translated || '';
      }
    } catch (e) {
      // ignore; will fall back
    }

    // Fallback: MyMemory if primary failed or empty
    if (!translatedText) {
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${encodeURIComponent(target)}`;
        const r2 = await _fetch(url);
        if (r2.ok) {
          const d2 = await r2.json();
          if (d2?.responseStatus === 200) {
            const candidate = d2?.responseData?.translatedText || '';
            const upper = (candidate || '').toUpperCase();
            if (candidate && !upper.includes('INVALID SOURCE LANGUAGE')) {
              translatedText = candidate;
            }
          }
        }
      } catch (e) {
        // ignore; will error below
      }
    }

    if (!translatedText) {
      return res.status(502).json({ error: 'Translation unavailable' });
    }

    translateCache.set(key, translatedText);
    res.json({ translatedText });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/women-employment';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const User = mongoose.model('User');
const bcrypt = require('bcrypt');
const Job = mongoose.model('Job');
const Application = mongoose.model('Application');
const Chat = mongoose.model('Chat');
const Message = mongoose.model('Message');
const Saved = mongoose.model('Saved');

// Socket.IO events
io.on('connection', (socket) => {
  socket.on('join', (chatId) => {
    if (socket.currentRoom) socket.leave(socket.currentRoom);
    socket.join(chatId);
    socket.currentRoom = chatId;
  });
});

// File upload setup for resumes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Signup route
app.post('/api/signup', async (req, res) => {
  const { username, password, role, profile } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role, profile });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    res.json({ message: 'Login successful', role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a job (Job Provider)
app.post('/api/jobs', async (req, res) => {
  const { title, description, company, location, username, requireResume } = req.body;
  if (!title || !description || !company || !location || !username) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const user = await User.findOne({ username, role: 'jobprovider' });
    if (!user) return res.status(400).json({ error: 'Invalid job provider' });
    // Optional fields for Internshala-like features
    const {
      jobType,
      workMode,
      category,
      durationWeeks,
      stipendMin,
      stipendMax,
      openings,
      skills,
      perks,
      startDate,
      applyBy
    } = req.body || {};
    const optional = {};
    if (jobType) optional.jobType = jobType;
    if (workMode) optional.workMode = workMode;
    if (category) optional.category = category;
    if (durationWeeks !== undefined) optional.durationWeeks = Number(durationWeeks);
    if (stipendMin !== undefined) optional.stipendMin = Number(stipendMin);
    if (stipendMax !== undefined) optional.stipendMax = Number(stipendMax);
    if (openings !== undefined) optional.openings = Number(openings);
    if (skills) optional.skills = Array.isArray(skills) ? skills : String(skills).split(',').map(s => s.trim()).filter(Boolean);
    if (perks) optional.perks = Array.isArray(perks) ? perks : String(perks).split(',').map(s => s.trim()).filter(Boolean);
    if (startDate) optional.startDate = new Date(startDate);
    if (applyBy) optional.applyBy = new Date(applyBy);

    const job = new Job({ title, description, company, location, requireResume: Boolean(requireResume), postedBy: user._id, ...optional });
    await job.save();
    res.status(201).json({ message: 'Job posted successfully', job });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List jobs by provider
app.get('/api/jobs', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });
  try {
    const user = await User.findOne({ username, role: 'jobprovider' });
    if (!user) return res.status(400).json({ error: 'Invalid job provider' });
    const jobs = await Job.find({ postedBy: user._id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List applications for a job
app.get('/api/jobs/:jobId/applications', async (req, res) => {
  const { jobId } = req.params;
  try {
    const applications = await Application.find({ job: jobId })
      .populate('applicant', 'username profile')
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a job
app.delete('/api/jobs/:jobId', async (req, res) => {
  const { jobId } = req.params;
  try {
    await Job.findByIdAndDelete(jobId);
    await Application.deleteMany({ job: jobId });
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List all jobs (Job Seeker)
app.get('/api/all-jobs', async (req, res) => {
  try {
    const {
      q,
      jobType,
      workMode,
      category,
      minStipend,
      location,
      remoteOnly,
      durationMax,
      startFrom,
      skills,
      perks
    } = req.query || {};

    const filter = {};
    if (q) filter.title = { $regex: new RegExp(q, 'i') };
    if (jobType) filter.jobType = jobType;
    if (workMode) filter.workMode = workMode;
    if (category) filter.category = { $regex: new RegExp(category, 'i') };
    if (location) filter.location = { $regex: new RegExp(location, 'i') };
    if (remoteOnly === 'true') filter.workMode = 'remote';
    if (minStipend !== undefined) {
      filter.$or = [
        { stipendMin: { $gte: Number(minStipend) } },
        { stipendMax: { $gte: Number(minStipend) } }
      ];
    }
    if (durationMax !== undefined) filter.durationWeeks = { $lte: Number(durationMax) };
    if (startFrom) filter.startDate = { $gte: new Date(startFrom) };
    if (skills) {
      const arr = Array.isArray(skills) ? skills : String(skills).split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) filter.skills = { $all: arr };
    }
    if (perks) {
      const arr = Array.isArray(perks) ? perks : String(perks).split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) filter.perks = { $all: arr };
    }

    const jobs = await Job.find(filter).populate('postedBy', 'username profile').sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Saved jobs
app.get('/api/saved', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });
  try {
    const user = await User.findOne({ username, role: 'jobseeker' });
    if (!user) return res.status(400).json({ error: 'Invalid job seeker' });
    const saved = await Saved.find({ user: user._id }).populate('job');
    res.json(saved.map(s => s.job));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/saved', async (req, res) => {
  const { username, jobId } = req.body || {};
  if (!username || !jobId) return res.status(400).json({ error: 'username and jobId required' });
  try {
    const user = await User.findOne({ username, role: 'jobseeker' });
    if (!user) return res.status(400).json({ error: 'Invalid job seeker' });
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const existing = await Saved.findOne({ user: user._id, job: job._id });
    if (existing) return res.json({ message: 'Already saved' });
    await Saved.create({ user: user._id, job: job._id });
    res.status(201).json({ message: 'Saved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/saved/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });
  try {
    const user = await User.findOne({ username, role: 'jobseeker' });
    if (!user) return res.status(400).json({ error: 'Invalid job seeker' });
    await Saved.deleteOne({ user: user._id, job: jobId });
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply for a job with resume and details
app.post('/api/apply', upload.single('resume'), async (req, res) => {
  const { jobId, username, applicantName, age, address, contactNo, email } = req.body;
  if (!jobId || !username) return res.status(400).json({ error: 'Job and username required' });
  try {
    const user = await User.findOne({ username, role: 'jobseeker' });
    if (!user) return res.status(400).json({ error: 'Invalid job seeker' });
    const existing = await Application.findOne({ job: jobId, applicant: user._id });
    if (existing) return res.status(400).json({ error: 'Already applied to this job' });

    const resumePath = req.file ? `/uploads/${req.file.filename}` : undefined;
    const appDoc = new Application({ job: jobId, applicant: user._id, applicantName, age, address, contactNo, email, resumePath });
    await appDoc.save();
    res.status(201).json({ message: 'Application submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List my applications
app.get('/api/my-applications', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });
  try {
    const user = await User.findOne({ username, role: 'jobseeker' });
    if (!user) return res.status(400).json({ error: 'Invalid job seeker' });
    const apps = await Application.find({ applicant: user._id })
      .populate('job')
      .sort({ createdAt: -1 });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get application details
app.get('/api/applications/:applicationId', async (req, res) => {
  const { applicationId } = req.params;
  try {
    const appDoc = await Application.findById(applicationId).populate('applicant', 'username profile').populate('job');
    if (!appDoc) return res.status(404).json({ error: 'Application not found' });
    res.json(appDoc);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Select application and create chat if needed
app.patch('/api/applications/:applicationId/select', async (req, res) => {
  const { applicationId } = req.params;
  try {
    const application = await Application.findById(applicationId).populate('applicant').populate('job');
    if (!application) return res.status(404).json({ error: 'Application not found' });

    application.status = 'accepted';
    await application.save();

    await Application.updateMany(
      { job: application.job, _id: { $ne: applicationId }, status: { $ne: 'accepted' } },
      { $set: { status: 'rejected' } }
    );

    const job = await Job.findById(application.job).populate('postedBy');
    let chat = await Chat.findOne({ job: job._id, application: application._id });
    if (!chat) {
      chat = await Chat.create({ participants: [job.postedBy._id, application.applicant._id], job: job._id, application: application._id });
    }

    res.json({ message: 'Applicant selected successfully', chatId: chat._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Chats
app.get('/api/chats', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid user' });
    const chats = await Chat.find({ participants: user._id }).populate('job').populate('application').populate('participants', 'username');
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/chats/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  try {
    const messages = await Message.find({ chat: chatId }).populate('sender', 'username').sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/chats/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  const { username, content } = req.body;
  if (!username || !content) return res.status(400).json({ error: 'username and content required' });
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid user' });
    const msg = await Message.create({ chat: chatId, sender: user._id, content });
    const populated = await Message.findById(msg._id).populate('sender', 'username');
    await Chat.findByIdAndUpdate(chatId, { lastMessageAt: new Date() });
    io.to(chatId).emit('newMessage', populated);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Test route
app.get('/', (req, res) => {
  res.send('Women Employment System API is running');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

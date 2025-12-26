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
const Block = require('./models/Block');
const Report = require('./models/Report');

const chatRoutes = require('./routes/chatRoutes');




const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const userSocketMap = new Map();

// Middleware - moved to top to parse request bodies
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/chats', chatRoutes);

// Current user info
app.get('/api/me', async (req, res) => {
  const { username } = req.query || {};
  if (!username) return res.status(400).json({ error: 'Username required' });
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ username: user.username, role: user.role, profile: user.profile || {} });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Update user profile
app.put('/api/profile', async (req, res) => {
  const { username, profile } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (profile) {
      if (profile.name !== undefined) user.profile.name = profile.name;
      if (profile.email !== undefined) user.profile.email = profile.email;
      if (profile.phone !== undefined) user.profile.phone = profile.phone;
      if (profile.preferredCategories !== undefined) user.profile.preferredCategories = profile.preferredCategories;
    }
    
    await user.save();
    res.json({ message: 'Profile updated', profile: user.profile });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Recommendations for a seeker
app.get('/api/recommendations', async (req, res) => {
  const { username, limit } = req.query || {};
  if (!username) return res.status(400).json({ error: 'Username required' });
  try {
    const uname = String(username).trim();
    const user = await User.findOne({ username: new RegExp(`^${uname}$`, 'i') });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'jobseeker') return res.status(400).json({ error: 'User is not a jobseeker' });
    const seeker = user;

    const preferred = Array.isArray(seeker?.profile?.preferredCategories) ? seeker.profile.preferredCategories : [];
    console.log(`[RECOMMENDATION] User: ${username}, Preferred: ${JSON.stringify(preferred)}`);

    const n = Math.max(5, Math.min(20, Number(limit) || 8));

    // If user has preferred categories, ONLY show jobs from those categories.
    if (preferred.length > 0) {
      const jobQuery = { category: { $in: preferred.map(c => new RegExp(`^${c}$`, 'i')) } };
      // Also exclude jobs they've already applied to
      const apps = await Application.find({ applicant: seeker._id }, 'job');
      const appliedJobIds = apps.map(a => a.job).filter(Boolean);
      jobQuery._id = { $nin: appliedJobIds };

      const jobs = await Job.find(jobQuery).populate('postedBy', 'username profile').sort({ createdAt: -1 }).limit(n); // Limit here as it's a direct recommendation
      return res.json(jobs);
    }

    // --- Fallback logic if no preferred categories are set: recommend based on application history ---
    const apps = await Application.find({ applicant: seeker._id }).populate('job');
    const appliedJobIds = apps.map(a => a.job?._id).filter(Boolean);

    const likedSkills = new Map();
    const likedCategories = new Map();
    for (const a of apps) {
      const j = a.job || {};
      if (Array.isArray(j.skills)) for (const s of j.skills) likedSkills.set(s, (likedSkills.get(s) || 0) + 1);
      if (j.category) likedCategories.set(j.category.toLowerCase(), (likedCategories.get(j.category.toLowerCase()) || 0) + 1);
    }

    // If no application history and no preferences, return empty list (do not show all jobs)
    if (likedCategories.size === 0 && likedSkills.size === 0) {
      return res.json([]);
    }

    const orConditions = [];
    if (likedCategories.size > 0) orConditions.push({ category: { $in: Array.from(likedCategories.keys()).map(c => new RegExp(`^${c}$`, 'i')) } });
    if (likedSkills.size > 0) orConditions.push({ skills: { $in: Array.from(likedSkills.keys()) } });

    // Find jobs that match liked categories or skills, excluding jobs already applied to.
    const jobQuery = { _id: { $nin: appliedJobIds }, $or: orConditions };
    const jobs = await Job.find(jobQuery).populate('postedBy', 'username profile').sort({ createdAt: -1 }).limit(200);

    const scoreJob = (j) => {
      let score = 0;
      if (Array.isArray(j.skills)) for (const s of j.skills) if (likedSkills.has(s)) score += 3 * likedSkills.get(s);
      if (j.category && likedCategories.has(j.category.toLowerCase())) score += 2 * likedCategories.get(j.category.toLowerCase());
      if (j.workMode === 'remote') score += 0.5; // gentle bias
      return score;
    };
    const ranked = jobs
      .map(j => ({ job: j, score: scoreJob(j) }))
      .sort((a, b) => b.score - a.score);

    res.json(ranked.slice(0, n).map(r => r.job));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Block user
app.post('/api/block', async (req, res) => {
  const { blocker, blocked } = req.body || {};
  if (!blocker || !blocked) return res.status(400).json({ error: 'blocker and blocked required' });
  try {
    const existing = await Block.findOne({ blocker, blocked });
    if (existing) return res.json({ blocked: true });
    await Block.create({ blocker, blocked });
    res.json({ blocked: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Unblock user
app.delete('/api/block', async (req, res) => {
  const { blocker, blocked } = req.query || {};
  if (!blocker || !blocked) return res.status(400).json({ error: 'blocker and blocked required' });
  try { await Block.deleteOne({ blocker, blocked }); res.json({ blocked: false }); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

// Block status
app.get('/api/block/status', async (req, res) => {
  const { me, other } = req.query || {};
  if (!me || !other) return res.status(400).json({ error: 'me and other required' });
  try {
    const isBlocked = await Block.findOne({ $or: [ { blocker: me, blocked: other }, { blocker: other, blocked: me } ] });
    res.json({ blocked: Boolean(isBlocked) });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// Report user
app.post('/api/report', async (req, res) => {
  const { reporter, target, reason, chatId } = req.body || {};
  if (!reporter || !target || !reason) return res.status(400).json({ error: 'reporter, target, reason required' });
  try { await Report.create({ reporter, target, reason, chatId }); res.json({ reported: true }); }
  catch { res.status(500).json({ error: 'Server error' }); }
});
const PORT = process.env.PORT || 5000;

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

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const User = require('./models/User');
const bcrypt = require('bcrypt');
const Job = require('./models/Job');
const Application = require('./models/Application');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
const Saved = require('./models/Saved');
const Notification = require('./models/Notification');

// Socket.IO events
io.on('connection', (socket) => {
  socket.on('register', (username) => {
    if (username) userSocketMap.set(username, socket.id);
  });

  socket.on('join', (data) => {
    let chatId = data;
    if (typeof data === 'object') {
      chatId = data.chatId;
      if (data.username) userSocketMap.set(data.username, socket.id);
    }
    if (socket.currentRoom) socket.leave(socket.currentRoom);
    socket.join(chatId);
    socket.currentRoom = chatId;
  });
  socket.on('typing', ({ chatId, username }) => {
    if (username) userSocketMap.set(username, socket.id);
    if (!chatId) return;
    // notify others in room
    socket.to(chatId).emit('typing', { chatId, username, at: Date.now() });
  });
  
  socket.on('disconnect', () => {
    for (const [user, id] of userSocketMap.entries()) {
      if (id === socket.id) {
        userSocketMap.delete(user);
        break;
      }
    }
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
  console.log('[SIGNUP] Payload:', { username, role, profile });
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
    const user = await User.findOne({ username: new RegExp(`^${String(username).trim()}$`, 'i') });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    res.json({ message: 'Login successful', role: user.role, username: user.username });
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

    // Create notification for selected applicant
    await Notification.create({
      recipient: application.applicant.username,
      message: `Congratulations! You have been selected for the position: ${application.job.title}`,
      type: 'selection',
      jobId: application.job._id,
      applicationId: application._id
    });

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
    const chats = await Chat.find({ participants: user._id }).populate('job').populate('application').populate('participants', 'username profile');
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get notifications for a user
app.get('/api/notifications', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });
  try {
    const notifications = await Notification.find({ recipient: username, read: false })
      .populate('jobId', 'title')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
app.patch('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.notificationId, { read: true });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all notifications as read for a user
app.post('/api/notifications/mark-read', async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: 'Username required' });
    const result = await Notification.updateMany({ recipient: username, read: false }, { $set: { read: true } });
    res.json({ updated: result.modifiedCount || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or get chat for messaging
app.post('/api/chats/create', async (req, res) => {
  const { jobId, applicationId, jobProviderUsername, applicantUsername } = req.body || {};
  try {
    const jobProvider = await User.findOne({ username: jobProviderUsername });
    const applicant = await User.findOne({ username: applicantUsername });
    if (!jobProvider || !applicant) return res.status(404).json({ error: 'Users not found' });

    const query = { job: jobId, participants: { $all: [jobProvider._id, applicant._id] } };
    if (applicationId) query.application = applicationId;

    let chat = await Chat.findOne(query);
    if (!chat) {
      const payload = { participants: [jobProvider._id, applicant._id], job: jobId };
      if (applicationId) payload.application = applicationId;
      chat = await Chat.create(payload);
    }
    res.json({ chatId: chat._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/chats/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  try {
    const messages = await Message.find({ chat: chatId }).populate('sender', 'username profile').sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit a message
app.patch('/api/messages/:messageId', async (req, res) => {
  const { messageId } = req.params;
  const { username, content } = req.body;
  if (!username || content === undefined) return res.status(400).json({ error: 'username and content are required' });

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (message.sender.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    message.content = content;
    message.edited = true;
    await message.save();

    const populated = await Message.findById(message._id).populate('sender', 'username profile');

    io.to(message.chat.toString()).emit('messageEdited', populated);

    res.json(populated);
  } catch (err) {
    console.error('Error editing message:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a message
app.delete('/api/messages/:messageId', async (req, res) => {
  const { messageId } = req.params;
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (message.sender.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // If the message was a file, delete it from the filesystem
    if (message.fileUrl) {
      const filePath = path.join(__dirname, message.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Failed to delete file: ${filePath}`, err);
        });
      }
    }

    await Message.findByIdAndDelete(messageId);

    io.to(message.chat.toString()).emit('messageDeleted', { messageId: message._id, chatId: message.chat });

    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/chats/:chatId/messages', upload.single('file'), async (req, res) => {
  const { chatId } = req.params;
  const { username, content } = req.body;
  if (!username || (!content && !req.file)) return res.status(400).json({ error: 'username and content or a file are required' });
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid user' });
    // Block check
    const chat = await Chat.findById(chatId).populate('participants', 'username profile').populate('job', 'title');
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const other = chat.participants.find(p => p.username !== username);
    if (other) {
      const isBlocked = await Block.findOne({ $or: [ { blocker: username, blocked: other.username }, { blocker: other.username, blocked: username } ] });
      if (isBlocked) return res.status(403).json({ error: 'Messaging blocked between users' });
    }

    const messageData = { chat: chatId, sender: user._id, content: content || '' };
    if (req.file) {
      messageData.fileUrl = `/uploads/${req.file.filename}`;
      messageData.fileName = req.file.originalname;
      messageData.fileType = req.file.mimetype;
    }

    const msg = await Message.create(messageData);
    const populated = await Message.findById(msg._id).populate('sender', 'username profile');
    await Chat.findByIdAndUpdate(chatId, { lastMessageAt: new Date() });
    
    // Create notification for the other participant
    const recipient = chat.participants.find(p => p.username !== username);
    if (recipient) {
      await Notification.create({
        recipient: recipient.username,
        message: `You have a new message from ${user.profile?.name || username} regarding: ${chat.job?.title || 'Job Application'}`,
        type: 'message',
        jobId: chat.job?._id
      });
    }
    
    const senderSocketId = userSocketMap.get(username);
    const senderSocket = senderSocketId ? io.sockets.sockets.get(senderSocketId) : null;
    if (senderSocket) {
      senderSocket.to(chatId).emit('newMessage', populated);
    } else {
      io.to(chatId).emit('newMessage', populated);
    }
    res.status(201).json({ message: 'Message sent', data: populated });
  } catch (err) {
    console.error("Error sending message:", err);
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

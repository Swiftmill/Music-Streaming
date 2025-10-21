const express = require('express');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { body, query, validationResult } = require('express-validator');
const sanitizeFilename = require('sanitize-filename');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime');
const mimeTypes = require('mime-types');
const archiver = require('archiver');
const winston = require('winston');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'local-music-secret';
const DATA_DIR = path.join(__dirname, 'data');
const MUSIC_DIR = path.join(DATA_DIR, 'music');
const PENDING_DIR = path.join(DATA_DIR, 'pending');
const META_DIR = path.join(DATA_DIR, 'meta');
const USERS_DIR = path.join(__dirname, 'users');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const LOG_FILE = path.join(DATA_DIR, 'activity.log');

[DATA_DIR, MUSIC_DIR, PENDING_DIR, META_DIR, USERS_DIR, PUBLIC_DIR, UPLOADS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${message}`)
  ),
  transports: [
    new winston.transports.File({ filename: LOG_FILE, maxsize: 1048576, maxFiles: 5 }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(PUBLIC_DIR));
app.use('/media/music', express.static(MUSIC_DIR));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

function buildErrorResponse(errors) {
  if (!errors.isEmpty()) {
    return { errors: errors.array().map((err) => ({ field: err.path, message: err.msg })) };
  }
  return null;
}

async function readJsonFile(filePath) {
  const data = await fsp.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

async function writeJsonFile(filePath, data) {
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function listUserFiles() {
  const files = await fsp.readdir(USERS_DIR);
  return files.filter((file) => file.endsWith('.json'));
}

async function getUser(username) {
  const file = path.join(USERS_DIR, `${username}.json`);
  try {
    return await readJsonFile(file);
  } catch (err) {
    return null;
  }
}

async function saveUser(user) {
  const file = path.join(USERS_DIR, `${user.username}.json`);
  await writeJsonFile(file, user);
}

async function listTracks(status) {
  const files = await fsp.readdir(META_DIR);
  const tracks = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const meta = await readJsonFile(path.join(META_DIR, file));
    if (!status || meta.status === status) {
      tracks.push(meta);
    }
  }
  return tracks;
}

async function appendLog(entry) {
  logger.info(entry);
}

function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || (req.user.role !== role && req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

async function ensureUserDirs(username) {
  const pendingDir = path.join(PENDING_DIR, username);
  const musicDir = path.join(MUSIC_DIR, username);
  if (!fs.existsSync(pendingDir)) {
    await fsp.mkdir(pendingDir, { recursive: true });
  }
  if (!fs.existsSync(musicDir)) {
    await fsp.mkdir(musicDir, { recursive: true });
  }
  return { pendingDir, musicDir };
}

async function calculateUserStorage(username) {
  const { pendingDir, musicDir } = await ensureUserDirs(username);
  async function dirSize(dir) {
    let total = 0;
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        total += await dirSize(entryPath);
      } else {
        const stat = await fsp.stat(entryPath);
        total += stat.size;
      }
    }
    return total;
  }
  const sizeBytes = (await dirSize(pendingDir)) + (await dirSize(musicDir));
  return sizeBytes / (1024 * 1024);
}

const allowedMimeTypes = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/ogg',
  'audio/x-m4a',
  'audio/mp4'
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const username = req.user?.username;
        if (!username) {
          return cb(new Error('Missing user context'));
        }
        const { pendingDir } = await ensureUserDirs(username);
        cb(null, pendingDir);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const sanitized = sanitizeFilename(file.originalname.toLowerCase());
      const unique = `${Date.now()}-${sanitized}`;
      cb(null, unique);
    }
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, true);
  }
});

function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '').trim();
}

app.post(
  '/api/auth/login',
  [body('username').isString().trim().notEmpty(), body('password').isString().notEmpty()],
  async (req, res) => {
    const errors = buildErrorResponse(validationResult(req));
    if (errors) {
      return res.status(422).json(errors);
    }
    const { username, password } = req.body;
    const user = await getUser(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: '12h'
    });
    await appendLog(`LOGIN ${username}`);
    res.json({ token, user: { username: user.username, role: user.role, displayName: user.displayName, badges: user.badges, verified: user.verified } });
  }
);

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  const user = await getUser(req.user.username);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    avatar: user.avatar,
    badges: user.badges,
    verified: user.verified,
    quota: user.quota
  });
});

app.post(
  '/api/tracks/upload',
  authenticateToken,
  upload.single('track'),
  [body('title').optional().isString().isLength({ min: 1, max: 120 }), body('album').optional().isString().isLength({ min: 1, max: 120 })],
  async (req, res) => {
    const errors = buildErrorResponse(validationResult(req));
    if (errors) {
      if (req.file) {
        await fsp.unlink(req.file.path).catch(() => undefined);
      }
      return res.status(422).json(errors);
    }

    const user = await getUser(req.user.username);
    if (!user) {
      if (req.file) {
        await fsp.unlink(req.file.path).catch(() => undefined);
      }
      return res.status(401).json({ message: 'User not found' });
    }

    const currentStorage = await calculateUserStorage(user.username);
    if (currentStorage > user.quota.maxStorageMb) {
      if (req.file) {
        await fsp.unlink(req.file.path).catch(() => undefined);
      }
      return res.status(413).json({ message: 'Storage quota exceeded' });
    }

    const pendingTracks = await listTracks('pending');
    const userPending = pendingTracks.filter((track) => track.artistUsername === user.username);
    if (userPending.length >= user.quota.maxPendingTracks) {
      if (req.file) {
        await fsp.unlink(req.file.path).catch(() => undefined);
      }
      return res.status(429).json({ message: 'Pending tracks quota reached' });
    }

    const meta = {
      id: uuidv4(),
      title: sanitizeText(req.body.title) || path.parse(req.file.originalname).name,
      album: sanitizeText(req.body.album) || 'Singles',
      artistUsername: user.username,
      artistDisplayName: user.displayName,
      originalFileName: req.file.originalname,
      storedFileName: path.basename(req.file.filename),
      pendingPath: req.file.path,
      approvedPath: null,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await writeJsonFile(path.join(META_DIR, `${meta.id}.json`), meta);
    await appendLog(`UPLOAD ${user.username} ${meta.id}`);

    res.status(201).json({ message: 'Track uploaded and awaiting moderation', track: meta });
  }
);

app.get('/api/tracks', authenticateToken, async (req, res) => {
  const tracks = await listTracks('approved');
  res.json(tracks);
});

app.get('/api/tracks/pending', authenticateToken, requireRole('admin'), async (req, res) => {
  const tracks = await listTracks('pending');
  res.json(tracks);
});

app.get('/api/tracks/:id', authenticateToken, async (req, res) => {
  const trackFile = path.join(META_DIR, `${req.params.id}.json`);
  try {
    const meta = await readJsonFile(trackFile);
    if (meta.status !== 'approved' && req.user.role !== 'admin' && meta.artistUsername !== req.user.username) {
      return res.status(403).json({ message: 'Track not available' });
    }
    res.json(meta);
  } catch (err) {
    res.status(404).json({ message: 'Track not found' });
  }
});

app.get('/api/tracks/:id/stream', authenticateToken, async (req, res) => {
  const trackFile = path.join(META_DIR, `${req.params.id}.json`);
  try {
    const meta = await readJsonFile(trackFile);
    if (meta.status !== 'approved' && req.user.role !== 'admin' && meta.artistUsername !== req.user.username) {
      return res.status(403).json({ message: 'Track not available' });
    }
    const filePath = meta.status === 'approved' ? meta.approvedPath : meta.pendingPath;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Audio file missing' });
    }
    res.setHeader('Content-Type', meta.mimeType || mime.getType(filePath));
    res.setHeader('Accept-Ranges', 'bytes');

    const stat = await fsp.stat(filePath);
    const range = req.headers.range;
    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });
      res.status(206).set({
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': chunkSize
      });
      stream.pipe(res);
    } else {
      res.setHeader('Content-Length', stat.size);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  } catch (err) {
    res.status(404).json({ message: 'Track not found' });
  }
});

app.post(
  '/api/admin/tracks/:id/approve',
  authenticateToken,
  requireRole('admin'),
  [body('album').optional().isString().isLength({ min: 1, max: 120 })],
  async (req, res) => {
    const errors = buildErrorResponse(validationResult(req));
    if (errors) {
      return res.status(422).json(errors);
    }
    const trackPath = path.join(META_DIR, `${req.params.id}.json`);
    try {
      const meta = await readJsonFile(trackPath);
      if (meta.status !== 'pending') {
        return res.status(409).json({ message: 'Track is not pending' });
      }
      const albumName = sanitizeText(req.body.album) || meta.album;
      const artistDirs = await ensureUserDirs(meta.artistUsername);
      const albumDir = path.join(artistDirs.musicDir, sanitizeFilename(albumName) || 'Singles');
      if (!fs.existsSync(albumDir)) {
        await fsp.mkdir(albumDir, { recursive: true });
      }
      const rawExtension = path.extname(meta.storedFileName) || `.${mimeTypes.extension(meta.mimeType) || 'mp3'}`;
      const normalizedExt = rawExtension.startsWith('.') ? rawExtension.slice(1) : rawExtension;
      const approvedName = sanitizeFilename(`${meta.title}.${normalizedExt}`);
      const approvedPath = path.join(albumDir, approvedName);
      await fsp.rename(meta.pendingPath, approvedPath);
      const updatedMeta = {
        ...meta,
        album: albumName,
        approvedPath,
        status: 'approved',
        updatedAt: new Date().toISOString()
      };
      delete updatedMeta.pendingPath;
      await writeJsonFile(trackPath, updatedMeta);
      await appendLog(`APPROVE ${req.user.username} ${meta.artistUsername} ${meta.id}`);
      res.json({ message: 'Track approved', track: updatedMeta });
    } catch (err) {
      res.status(404).json({ message: 'Track not found' });
    }
  }
);

app.post(
  '/api/admin/tracks/:id/reject',
  authenticateToken,
  requireRole('admin'),
  [body('reason').optional().isString().isLength({ max: 240 })],
  async (req, res) => {
    const trackPath = path.join(META_DIR, `${req.params.id}.json`);
    try {
      const meta = await readJsonFile(trackPath);
      if (meta.pendingPath && fs.existsSync(meta.pendingPath)) {
        await fsp.unlink(meta.pendingPath);
      }
      await fsp.unlink(trackPath);
      await appendLog(`REJECT ${req.user.username} ${meta.artistUsername} ${meta.id} ${sanitizeText(req.body.reason)}`);
      res.json({ message: 'Track rejected and removed' });
    } catch (err) {
      res.status(404).json({ message: 'Track not found' });
    }
  }
);

app.patch(
  '/api/admin/users/:username',
  authenticateToken,
  requireRole('admin'),
  [
    body('displayName').optional().isString().isLength({ min: 2, max: 120 }),
    body('verified').optional().isBoolean(),
    body('badges').optional().isArray({ max: 10 }),
    body('quota.maxPendingTracks').optional().isInt({ min: 1, max: 100 }),
    body('quota.maxStorageMb').optional().isInt({ min: 128, max: 10240 })
  ],
  async (req, res) => {
    const errors = buildErrorResponse(validationResult(req));
    if (errors) {
      return res.status(422).json(errors);
    }
    const user = await getUser(req.params.username);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const updates = req.body;
    if (updates.displayName) {
      user.displayName = sanitizeText(updates.displayName);
    }
    if (typeof updates.verified === 'boolean') {
      user.verified = updates.verified;
    }
    if (Array.isArray(updates.badges)) {
      user.badges = updates.badges.map((badge) => sanitizeText(badge)).filter(Boolean);
    }
    if (updates.quota) {
      user.quota = {
        ...user.quota,
        ...updates.quota
      };
    }
    await saveUser(user);
    await appendLog(`USER_UPDATE ${req.user.username} ${user.username}`);
    res.json({ message: 'User updated', user });
  }
);

app.get('/api/admin/users', authenticateToken, requireRole('admin'), async (req, res) => {
  const files = await listUserFiles();
  const users = [];
  for (const file of files) {
    const user = await readJsonFile(path.join(USERS_DIR, file));
    const { passwordHash, ...rest } = user;
    users.push(rest);
  }
  res.json(users);
});

app.get('/api/admin/logs', authenticateToken, requireRole('admin'), async (req, res) => {
  const log = await fsp.readFile(LOG_FILE, 'utf8').catch(() => '');
  res.type('text/plain').send(log);
});

app.post('/api/admin/backup', authenticateToken, requireRole('admin'), async (req, res) => {
  const backupName = `backup-${Date.now()}.zip`;
  const backupPath = path.join(META_DIR, backupName);
  const output = fs.createWriteStream(backupPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    appendLog(`BACKUP ${req.user.username} ${backupName}`).catch(() => undefined);
    res.json({ message: 'Backup created', file: backupName });
  });

  archive.on('error', (err) => {
    res.status(500).json({ message: 'Failed to create backup', error: err.message });
  });

  archive.pipe(output);
  archive.directory(DATA_DIR, false);
  archive.directory(USERS_DIR, 'users');
  archive.finalize();
});

app.get('/api/search', authenticateToken, [query('q').isString().isLength({ min: 1 })], async (req, res) => {
  const errors = buildErrorResponse(validationResult(req));
  if (errors) {
    return res.status(422).json(errors);
  }
  const q = sanitizeText(req.query.q).toLowerCase();
  const tracks = await listTracks('approved');
  const results = tracks.filter((track) => {
    return (
      track.title.toLowerCase().includes(q) ||
      track.album.toLowerCase().includes(q) ||
      track.artistUsername.toLowerCase().includes(q) ||
      track.artistDisplayName.toLowerCase().includes(q)
    );
  });
  res.json(results);
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(500).json({ message: err.message });
  }
  next();
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});

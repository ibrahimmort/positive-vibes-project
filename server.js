require('dotenv').config(); // Ensure dotenv is configured early
const express = require('express');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb'); // Ensure ObjectId is imported
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const path = require('path');
const nodemailer = require('nodemailer');
const geoip = require('geoip-lite');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', 1); // <-- ADD THIS LINE: Trust the first proxy hop (Fly.io)

const PORT = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI;
const sessionSecret = process.env.SESSION_SECRET;

if (!mongoUri || !sessionSecret) {
  console.error("[SERVER START] FATAL ERROR: MONGODB_URI and/or SESSION_SECRET are missing!");
  process.exit(1); // Exit if critical vars missing
}
console.log(`[SERVER START] PORT configured: ${PORT}`);
console.log(`[SERVER START] MONGODB_URI exists: ${!!mongoUri}`);
console.log(`[SERVER START] SESSION_SECRET exists: ${!!sessionSecret}`);


// Middleware for parsing and static files
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
console.log("[SERVER START] Express middleware configured.");

let db;

/**
 * Calculates the start of the week (Monday) for a given date.
 * @param {Date} date - The input date.
 * @returns {Date} - The date representing the start of the week (Monday, 00:00:00 UTC).
 */
function getStartOfWeek(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday...
  const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1); // Calculate diff to Monday
  const weekStart = new Date(d.setUTCDate(diff));
  return weekStart;
}

/**
 * Calculates the start of the next week (Monday) based on a given date.
 * @param {Date} date - The input date.
 * @returns {Date} - The date representing the start of the next week (Monday, 00:00:00 UTC).
 */
function getNextWeekStart(date) {
    const currentWeekStart = getStartOfWeek(date);
    const nextWeekStartDate = new Date(currentWeekStart);
    nextWeekStartDate.setUTCDate(currentWeekStart.getUTCDate() + 7); // Add 7 days
    return nextWeekStartDate;
}

// --- Badge Definitions ---
const BADGE_TIERS = [
    { weeks: 1,  name: "First Push!" }, { weeks: 4,  name: "Streak Starter" },
    { weeks: 13, name: "Good Deed Grower" }, { weeks: 26, name: "Half-Year High-Five Hero" },
    { weeks: 39, name: "Positivity Powerhouse" }, { weeks: 52, name: "The Ultimate Vibe Uplifter" }
];
// -----------------------

// --- Nodemailer Configuration ---
let transporter;
console.log("[SERVER START] Configuring Nodemailer...");
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_FROM && process.env.EMAIL_TO) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || "587", 10),
    secure: parseInt(process.env.EMAIL_PORT || "587", 10) === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS, },
  });
  transporter.verify()
    .then(() => console.log('[SERVER START] Nodemailer transporter is ready.'))
    .catch(err => console.error('[SERVER START] Nodemailer transporter configuration error:', err));
} else {
  console.warn('[SERVER START] Email configuration missing. Contact form disabled.');
  transporter = null;
}


async function connectDB() {
  console.log("[CONNECT DB] Attempting MongoDB connection...");
  if (!mongoUri) {
      console.error("[CONNECT DB] MONGODB_URI is not defined!");
      throw new Error("MONGODB_URI is not defined!");
  }
  const client = new MongoClient(mongoUri);
  try {
      await client.connect();
      db = client.db('positiveVibesDB');
      console.log('[CONNECT DB] MongoDB Connected successfully.');
      console.log("[CONNECT DB] Ensuring indexes...");
      await Promise.all([
          db.collection('users').createIndex({ email: 1 }, { unique: true }),
          db.collection('users').createIndex({ resetPasswordToken: 1 }),
          db.collection('vibes').createIndex({ userId: 1, createdAt: -1 }),
          db.collection('vibes').createIndex({ vibeLocation: 1, createdAt: -1 }),
          db.collection('sessions').createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
          db.collection('weeklyThemes').createIndex({ startDate: -1 })
      ]);
      console.log("[CONNECT DB] Indexes ensured.");
  } catch (err) {
       console.error("[CONNECT DB] MongoDB connection or index creation failed:", err);
       throw err;
  }
}

// --- Connect to DB and Start Server ---
console.log("[SERVER START] Calling connectDB()...");
connectDB().then(() => {
  console.log("[SERVER START] connectDB() successful. Configuring routes...");

  // Session middleware **AFTER** trust proxy
  app.use(session({
    secret: sessionSecret, resave: false, saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoUri, dbName: 'positiveVibesDB', collectionName: 'sessions', ttl: 14 * 24 * 60 * 60 }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Should be true on Fly.io (HTTPS)
        httpOnly: true,
        sameSite: 'lax', // 'lax' is usually fine, 'none' requires secure:true
        maxAge: 14 * 24 * 60 * 60 * 1000
    }
   }));
  console.log("[SERVER START] Session middleware configured.");

  // Authentication Middleware
  function isAuthenticated(req, res, next) {
      // Check session and userId exist
      if (req.session && req.session.userId) {
          console.log(`[Auth Check] Authenticated request for user ID: ${req.session.userId}`);
          next();
      } else {
          console.warn(`[Auth Check] Unauthenticated request. Path: ${req.path}, Session ID: ${req.sessionID || 'None'}`);
          res.status(401).json({ message: "Authentication required. Please log in." });
      }
  }

  // --- Routes ---
  console.log("[SERVER START] Defining routes...");
  app.post('/api/auth/signup', async (req, res) => { /* ... unchanged ... */ });
  app.post('/api/auth/login', async (req, res) => { /* ... unchanged ... */ });
  app.post('/api/auth/logout', (req, res) => { /* ... unchanged ... */ });
  app.get('/api/auth/status', async (req, res) => { /* ... unchanged ... */ });
  app.post('/api/auth/forgot-password', async (req, res) => { /* ... unchanged ... */ });
  app.post('/api/auth/reset-password', async (req, res) => { /* ... unchanged ... */ });
  app.post('/api/vibes', isAuthenticated, async (req, res) => { /* ... unchanged ... */ });
  app.get('/api/stats', async (req, res) => { /* ... unchanged ... */ });
  app.get('/api/theme/current', async (req, res) => { /* ... unchanged ... */ });
  app.get('/api/map-data', async (req, res) => { /* ... unchanged ... */ });
  app.post('/api/contact', async (req, res) => { /* ... unchanged ... */ });
  console.log("[SERVER START] API routes defined.");

  // --- SPA fallback ---
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) { return res.status(404).json({ message: "API endpoint not found" }); }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
  console.log("[SERVER START] SPA fallback configured.");

  // --- Error Handling Middleware ---
  app.use((err, req, res, next) => {
      console.error("[ERROR HANDLER] Unhandled error:", err.stack || err);
      const status = err.status || 500;
      const message = process.env.NODE_ENV === 'production' ? "An unexpected error occurred." : (err.message || "Something went wrong!");
      res.status(status).json({ message: message });
  });
  console.log("[SERVER START] Error handling middleware configured.");


  app.listen(PORT, () => {
         console.log(`[SERVER START] Server listening on port ${PORT}... Application should be LIVE.`);
     });

 }).catch(err => {
     console.error("[SERVER START] CRITICAL ERROR during startup (connectDB failed):", err);
     process.exit(1); // Exit if database connection fails
 });

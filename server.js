// IMPORTANT: Initialize Sentry very first!
// Assumes instrument.js is in the same directory as server.js
require("./instrument.js");
console.log("[SERVER START] Sentry instrumentation loaded.");

require('dotenv').config(); // Ensure dotenv is configured early
console.log("[SERVER START] dotenv configured.");

const express = require('express');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb'); // Ensure ObjectId is imported
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const path = require('path');
const nodemailer = require('nodemailer');
const geoip = require('geoip-lite');
const crypto = require('crypto');
console.log("[SERVER START] Required modules loaded.");

const app = express();

// --- Trust Proxy Setting ---
// Needs to be set BEFORE session middleware is used.
// '1' trusts the first hop (Fly.io's proxy).
app.set('trust proxy', 1);
console.log("[SERVER START] 'trust proxy' set.");

const PORT = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI;
const sessionSecret = process.env.SESSION_SECRET;

// --- Environment Variable Check ---
console.log(`[SERVER START] PORT configured: ${PORT}`);
console.log(`[SERVER START] NODE_ENV: ${process.env.NODE_ENV}`); // Log NODE_ENV
console.log(`[SERVER START] MONGODB_URI exists: ${!!mongoUri}`);
console.log(`[SERVER START] SESSION_SECRET exists: ${!!sessionSecret}`);
if (!mongoUri || !sessionSecret) {
  console.error("[SERVER START] FATAL ERROR: MONGODB_URI and/or SESSION_SECRET are missing!");
  process.exit(1);
}

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
console.log("[SERVER START] Express middleware configured.");

let db;

// --- Helper Functions (getStartOfWeek, getNextWeekStart) ---
function getStartOfWeek(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday...
  const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1); // Calculate diff to Monday
  const weekStart = new Date(d.setUTCDate(diff));
  return weekStart;
}
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
  if (!mongoUri) { console.error("[CONNECT DB] MONGODB_URI is not defined!"); throw new Error("MONGODB_URI is not defined!"); }
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
  } catch (err) { console.error("[CONNECT DB] MongoDB connection or index creation failed:", err); throw err; }
}

// --- Connect to DB and Start Server ---
console.log("[SERVER START] Calling connectDB()...");
connectDB().then(() => {
  console.log("[SERVER START] connectDB() successful. Configuring routes...");

  // --- Session Middleware ---
  // Ensure this is AFTER app.set('trust proxy', 1)
  app.use(session({
    secret: sessionSecret, resave: false, saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoUri, dbName: 'positiveVibesDB', collectionName: 'sessions', ttl: 14 * 24 * 60 * 60 }),
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax', maxAge: 14 * 24 * 60 * 60 * 1000 }
   }));
  console.log(`[SERVER START] Session middleware configured. Cookie secure flag: ${process.env.NODE_ENV === 'production'}`);

  // --- Authentication Middleware ---
  function isAuthenticated(req, res, next) {
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
  app.post('/api/auth/signup', async (req, res) => {
    const { email, password, location } = req.body;
    if (!email || !password || password.length < 6) return res.status(400).json({ message: "Valid email and password (min 6 chars) required" });
    const userLocation = location ? location.trim() : null;
    try {
        const exists = await db.collection('users').findOne({ email });
        if (exists) return res.status(409).json({ message: "Email already registered" });
        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = { email, passwordHash, location: userLocation, createdAt: new Date(), currentStreak: 0, longestStreak: 0, lastVibeWeekStart: null, badges: [] };
        const insertResult = await db.collection('users').insertOne(newUser);
        console.log(`[Signup] New user created with ID: ${insertResult.insertedId}`);
        res.status(201).json({ message: "Signup successful! Please log in." });
    } catch (error) { console.error("Signup error:", error); res.status(500).json({ message: "Server error during signup" }); }
  });
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });
    try {
        const user = await db.collection('users').findOne({ email });
        if (!user || !user.passwordHash) return res.status(401).json({ message: "Invalid email or password" });
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) return res.status(401).json({ message: "Invalid email or password" });
        req.session.regenerate((err) => {
            if (err) { console.error("Session regeneration error:", err); return res.status(500).json({ message: "Server error during login" }); }
            req.session.userId = user._id.toString(); // Store as string
            req.session.email = user.email;
            console.log(`[Login] User ${user.email} logged in. Session ID set for user ID: ${req.session.userId}`);
            res.json({ message: "Login successful", user: { email: user.email } });
        });
    } catch (error) { console.error("Login error:", error); res.status(500).json({ message: "Server error during login" }); }
  });
  app.post('/api/auth/logout', (req, res) => {
    const sessionId = req.session ? req.session.id : 'N/A'; // Safely access session ID
    if (req.session) {
        req.session.destroy((err) => {
            if (err) { console.error("Logout error:", err); return res.status(500).json({ message: "Error logging out" }); }
            res.clearCookie('connect.sid'); // Use the default cookie name
            console.log(`[Logout] Session ${sessionId} destroyed.`);
            res.json({ message: "Logged out" });
        });
    } else {
         console.log("[Logout] No session found to destroy.");
         res.json({ message: "Logged out (no session)" });
    }
  });
  app.get('/api/auth/status', async (req, res) => {
    if (!req.session || !req.session.userId) { console.log("[Status] No active session found."); return res.json({ loggedIn: false }); }
    const userIdFromSession = req.session.userId;
    console.log(`[Status] Checking status for session user ID: ${userIdFromSession}`);
    try {
        let userObjectId; try { userObjectId = new ObjectId(userIdFromSession); } catch (idError) { console.error(`[Status] Invalid user ID format in session: ${userIdFromSession}`, idError); req.session.destroy(); return res.json({ loggedIn: false }); }
        const user = await db.collection('users').findOne( { _id: userObjectId }, { projection: { email: 1, currentStreak: 1, longestStreak: 1, lastVibeWeekStart: 1, badges: 1 } } );
        if (!user) { console.warn(`[Status] User data not found in DB for session user ID: ${userIdFromSession}. Destroying session.`); req.session.destroy(); return res.json({ loggedIn: false }); }
        console.log(`[Status] Found user data for ${user.email}`);
        let currentStreak = user.currentStreak || 0; let longestStreak = user.longestStreak || 0; let userBadges = user.badges || []; const lastVibeWeekStartDate = user.lastVibeWeekStart;
        const now = new Date(); const currentWeekStart = getStartOfWeek(now); const previousWeekStart = new Date(currentWeekStart); previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7);
        let needsDbUpdate = false; let updateOperation = {};
        if (lastVibeWeekStartDate) { if (lastVibeWeekStartDate instanceof Date && lastVibeWeekStartDate.getTime() < previousWeekStart.getTime()) { if (currentStreak !== 0) { console.log(`[Streak Check] User ${user.email} missed a week. Resetting streak.`); currentStreak = 0; needsDbUpdate = true; updateOperation.$set = { ...(updateOperation.$set || {}), currentStreak: 0 }; } } }
        else if (currentStreak !== 0) { console.log(`[Streak Check] User ${user.email} has no lastVibeWeekStart but streak > 0. Resetting streak.`); currentStreak = 0; needsDbUpdate = true; updateOperation.$set = { ...(updateOperation.$set || {}), currentStreak: 0 }; }
        const newlyEarnedBadges = []; for (const tier of BADGE_TIERS) { if (longestStreak >= tier.weeks && !userBadges.includes(tier.name)) { newlyEarnedBadges.push(tier.name); } }
        if (newlyEarnedBadges.length > 0) { updateOperation.$addToSet = { badges: { $each: newlyEarnedBadges } }; needsDbUpdate = true; console.log(`[Badge Check] User ${user.email} earned new badges: ${newlyEarnedBadges.join(', ')}`); }
        if (needsDbUpdate) { try { console.log(`[Status Update] Updating DB for ${user.email}:`, JSON.stringify(updateOperation)); const updateResult = await db.collection('users').updateOne({ _id: user._id }, updateOperation); console.log(`[Status Update] DB update result for ${user.email}: Matched ${updateResult.matchedCount}, Modified ${updateResult.modifiedCount}`); if (newlyEarnedBadges.length > 0 && updateResult.modifiedCount > 0) { userBadges = [...userBadges, ...newlyEarnedBadges]; } } catch (updateError) { console.error(`[Status Update] FAILED to update DB for user ${user.email}:`, updateError); if (updateOperation.$set && updateOperation.$set.currentStreak === 0) { currentStreak = user.currentStreak || 0; } } }
         let nextBadgeName = "All badges earned!"; let nextBadgeProgress = 100; let currentTierWeeks = 0; let nextTierWeeks = Infinity; const earnedBadgeNames = userBadges; let highestEarnedTier = null;
         for (let i = BADGE_TIERS.length - 1; i >= 0; i--) { if (earnedBadgeNames.includes(BADGE_TIERS[i].name)) { highestEarnedTier = BADGE_TIERS[i]; break; } }
         currentTierWeeks = highestEarnedTier ? highestEarnedTier.weeks : 0; let nextTier = null;
         for (const tier of BADGE_TIERS) { if (!earnedBadgeNames.includes(tier.name)) { nextTier = tier; break; } }
         if (nextTier) { nextBadgeName = nextTier.name; nextTierWeeks = nextTier.weeks; const progressRaw = (longestStreak - currentTierWeeks) / (nextTierWeeks - currentTierWeeks); nextBadgeProgress = Math.max(0, Math.min(100, Math.floor(progressRaw * 100))); }
         const lastVibe = await db.collection('vibes').findOne( { userId: user._id }, { sort: { createdAt: -1 }, projection: { createdAt: 1 } } );
        res.json({ loggedIn: true, email: user.email, lastVibeTimestamp: lastVibe ? lastVibe.createdAt.toISOString() : null, currentStreak: currentStreak, longestStreak: longestStreak, badges: userBadges, nextBadgeName: nextBadgeName, nextBadgeProgress: nextBadgeProgress });
      } catch (error) { console.error("[Status] Error fetching user status:", error); res.status(500).json({ loggedIn: false, message: "Error fetching status" }); }
  });
  app.post('/api/auth/forgot-password', async (req, res) => {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email address is required." });
      if (!transporter) { console.error("Forgot password request received, but email transporter is not configured."); return res.json({ message: "If an account with that email exists, a password reset link has been sent." }); }
      try {
          const user = await db.collection('users').findOne({ email });
          if (!user) { console.log(`Password reset requested for non-existent email: ${email}`); return res.json({ message: "If an account with that email exists, a password reset link has been sent." }); }
          const token = crypto.randomBytes(32).toString('hex');
          const expires = new Date(Date.now() + 3600000);
          await db.collection('users').updateOne( { _id: user._id }, { $set: { resetPasswordToken: token, resetPasswordExpires: expires } } );
          const resetLink = `http://localhost:${PORT}/reset-password.html?token=${token}`;
          const mailOptions = { from: process.env.EMAIL_FROM, to: user.email, subject: 'Password Reset Request - Positive Vibes Project', text: `Link: ${resetLink}`, html: `<p><a href="${resetLink}">Reset Password Link</a> (Expires in 1 hour)</p>` };
          try { await transporter.sendMail(mailOptions); console.log(`Password reset email sent to ${user.email}`); res.json({ message: "If an account with that email exists, a password reset link has been sent." }); }
          catch (emailError) { console.error("Error sending password reset email:", emailError); res.json({ message: "If an account with that email exists, a password reset link has been sent." }); }
      } catch (error) { console.error("Error in forgot password process:", error); res.json({ message: "If an account with that email exists, a password reset link has been sent." }); }
  });
  app.post('/api/auth/reset-password', async (req, res) => {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ message: "Token and new password are required." });
      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters long." });
      try {
          const user = await db.collection('users').findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } });
          if (!user) return res.status(400).json({ message: "Password reset token is invalid or has expired." });
          const passwordHash = await bcrypt.hash(password, 10);
          await db.collection('users').updateOne( { _id: user._id }, { $set: { passwordHash: passwordHash }, $unset: { resetPasswordToken: "", resetPasswordExpires: "" } } );
          console.log(`Password successfully reset for user: ${user.email}`);
          res.json({ message: "Password has been reset successfully." });
      } catch (error) { console.error("Error during password reset:", error); res.status(500).json({ message: "An error occurred while resetting the password." }); }
  });


  // --- Vibes routes ---
  app.post('/api/vibes', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const now = new Date();
    const startOfCurrentWeek = getStartOfWeek(now);
    const previousWeekStart = new Date(startOfCurrentWeek);
    previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7);
    let nextWeekStartTime = getNextWeekStart(now);
    try {
        let userObjectId; try { userObjectId = new ObjectId(userId); } catch (idError) { console.error(`[Vibes Route] Invalid user ID format in session: ${userId}`, idError); return res.status(400).json({ message: "Invalid user session." }); }
        let userLocation = null; let currentStreak = 0; let longestStreak = 0; let lastVibeWeekStartDate = null; let userEmailForLog = `ID ${userId}`;
        const user = await db.collection('users').findOne( { _id: userObjectId }, { projection: { email: 1, location: 1, currentStreak: 1, longestStreak: 1, lastVibeWeekStart: 1 } } );
        if (!user) { console.error(`[Vibes Route] Could not find user ${userId} despite authentication.`); return res.status(404).json({ message: "User data not found." }); }
        if(user.email) userEmailForLog = user.email;
        userLocation = user.location; currentStreak = user.currentStreak || 0; longestStreak = user.longestStreak || 0; lastVibeWeekStartDate = user.lastVibeWeekStart;
        console.log(`[Vibes Route] User data fetched for ${userEmailForLog}. Streak: ${currentStreak}, Last Vibe Week: ${lastVibeWeekStartDate instanceof Date ? lastVibeWeekStartDate.toISOString() : 'None'}`);
        const existingVibeThisWeek = await db.collection('vibes').findOne({ userId: user._id, createdAt: { $gte: startOfCurrentWeek } });
        if (existingVibeThisWeek) { nextWeekStartTime = getNextWeekStart(existingVibeThisWeek.createdAt); console.log(`[Vibes Route] User ${userEmailForLog} already pushed this week. Sending 429.`); return res.status(429).json({ message: "You've already spread your vibe this week!", nextAvailableTimestamp: nextWeekStartTime.toISOString() }); }
        let updatedStreak = 0;
        if (lastVibeWeekStartDate instanceof Date && lastVibeWeekStartDate.getTime() === previousWeekStart.getTime()) { updatedStreak = currentStreak + 1; console.log(`[Streak Update] User ${userEmailForLog} continued streak. New streak: ${updatedStreak}`); }
        else { updatedStreak = 1; console.log(`[Streak Update] User ${userEmailForLog} starting/resetting streak. New streak: 1`); }
        const updatedLongestStreak = Math.max(longestStreak, updatedStreak);
        console.log(`[Streak Update] Calculated: updatedStreak=${updatedStreak}, updatedLongestStreak=${updatedLongestStreak}`);
        console.log(`[Vibes Route] Attempting to insert vibe for ${userEmailForLog}...`);
        await db.collection('vibes').insertOne({ userId: user._id, createdAt: now, vibeLocation: userLocation });
        console.log(`[Vibes Route] Vibe insert completed for ${userEmailForLog}.`);
        console.log(`[Vibes Route] Attempting to update user ${userEmailForLog} streak info...`);
        const updateResult = await db.collection('users').updateOne( { _id: user._id }, { $set: { currentStreak: updatedStreak, longestStreak: updatedLongestStreak, lastVibeWeekStart: startOfCurrentWeek } } );
        console.log(`[Vibes Route] User update result for ${userEmailForLog}: Matched ${updateResult.matchedCount}, Modified ${updateResult.modifiedCount}`);
        if (updateResult.matchedCount === 0) console.error(`[Vibes Route] FAILED TO MATCH user ${userEmailForLog} for streak update! ID: ${user._id}`);
        else if (updateResult.modifiedCount === 0) console.warn(`[Vibes Route] User ${userEmailForLog} streak info update resulted in no modification.`);
        else console.log(`[Vibes Route] User ${userEmailForLog} streak info updated successfully in DB.`);
        nextWeekStartTime = getNextWeekStart(now);
        console.log(`[SERVER LOG /api/vibes - 201] Calculated next available time: ${nextWeekStartTime.toISOString()}`);
        res.status(201).json({ message: "Vibe Pushed! Thank you!", nextAvailableTimestamp: nextWeekStartTime.toISOString() });
    } catch (error) { console.error(`[Vibes Route] UNEXPECTED ERROR for user ${userId}:`, error); res.status(500).json({ message: "Server error recording vibe" }); }
  });

  // --- Stats Route ---
  app.get('/api/stats', async (req, res) => {
    try {
        const thisWeekStart = getStartOfWeek(new Date());
        const stats = await db.collection('vibes').aggregate([ { $facet: { "weekly": [ { $match: { createdAt: { $gte: thisWeekStart } } }, { $count: "count" } ], "total": [ { $count: "count" } ] } } ]).toArray();
        const weeklyVibes = stats[0]?.weekly[0]?.count || 0;
        const totalVibes = stats[0]?.total[0]?.count || 0;
        res.json({ weeklyVibes, totalVibes });
    } catch (error) { console.error("Error fetching stats:", error); res.status(500).json({ message: "Server error fetching stats" }); }
  });

  // --- Theme Route ---
  app.get('/api/theme/current', async (req, res) => {
    try {
        const now = new Date();
        const startOfCurrentWeek = getStartOfWeek(now);
        const currentTheme = await db.collection('weeklyThemes').findOne( { startDate: { $lte: startOfCurrentWeek } }, { sort: { startDate: -1 } } );
        if (currentTheme) { res.json({ theme: currentTheme.theme, suggestions: currentTheme.suggestions }); }
        else { res.status(404).json({ theme: "Stay Tuned!", suggestions: ["A new theme is coming soon.", "Keep spreading positive vibes!", "Check back next week."] }); }
    } catch (error) { console.error("Error fetching current theme:", error); res.status(500).json({ message: "Server error fetching theme" }); }
  });

  // --- Map Data Route ---
  app.get('/api/map-data', async (req, res) => {
    try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const mapData = await db.collection('vibes').aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo }, vibeLocation: { $ne: null, $ne: "" } }},
            { $group: { _id: "$vibeLocation", count: { $sum: 1 } }},
            { $project: { _id: 0, location: "$_id", count: "$count" }},
            { $sort: { count: -1 } }, { $limit: 200 }
        ]).toArray();
        res.json(mapData);
    } catch (error) { console.error("Error fetching map data:", error); res.status(500).json({ message: "Server error fetching map data" }); }
  });

  // --- Contact Form Route ---
  app.post('/api/contact', async (req, res) => {
    const { message } = req.body;
    if (!message || message.trim().length === 0) return res.status(400).json({ message: "Message content cannot be empty." });
    if (!transporter) { console.error("Contact form submitted, but email transporter is not configured."); return res.status(500).json({ message: "Message received, but server email configuration is incomplete." }); }
    let senderInfo = "An anonymous user"; let replyToEmail = undefined;
    if (req.session.userId && req.session.email) { senderInfo = `User ${req.session.email}`; replyToEmail = req.session.email; }
    const mailOptions = { from: process.env.EMAIL_FROM, to: process.env.EMAIL_TO, replyTo: replyToEmail, subject: `PVP Contact Form Message from ${senderInfo}`, text: `Sender: ${senderInfo}\n\nMessage:\n${message}`, html: `<p><b>Sender:</b> ${senderInfo}</p><p><b>Message:</b></p><pre>${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`, };
    try {
      let info = await transporter.sendMail(mailOptions);
      console.log('Contact email sent successfully. Message ID: %s', info.messageId);
      res.json({ message: "Message sent successfully! Thank you." });
    } catch (error) { console.error("Error sending contact email via nodemailer:", error); res.status(500).json({ message: "Failed to send message due to a server error. Please try again later." }); }
  });


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

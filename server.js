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

// IMPORTANT: Initialize Sentry very first if using!
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) { try { require("./instrument.js"); console.log("[SERVER START] Sentry instrumentation loaded."); } catch(sentryError) { console.error("[SERVER START] Failed to load Sentry instrumentation:", sentryError); } }
else { console.log("[SERVER START] Sentry instrumentation skipped (NODE_ENV not production or SENTRY_DSN missing)."); }


const app = express();

// --- Trust Proxy Setting ---
app.set('trust proxy', 1);
console.log("[SERVER START] 'trust proxy' set.");

const PORT = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI;
const sessionSecret = process.env.SESSION_SECRET;
const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
console.log(`[SERVER START] Using FRONTEND_URL: ${frontendUrl}`);

// --- Environment Variable Check ---
console.log(`[SERVER START] PORT configured: ${PORT}`);
console.log(`[SERVER START] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[SERVER START] MONGODB_URI exists: ${!!mongoUri}`);
console.log(`[SERVER START] SESSION_SECRET exists: ${!!sessionSecret}`);
if (!mongoUri || !sessionSecret) { console.error("[SERVER START] FATAL ERROR: MONGODB_URI and/or SESSION_SECRET are missing!"); process.exit(1); }

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
console.log("[SERVER START] Express middleware configured.");

let db;

// --- Helper Functions (getStartOfWeek, getNextWeekStart) ---
function getStartOfWeek(date) { const d = new Date(date); d.setUTCHours(0, 0, 0, 0); const day = d.getUTCDay(); const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1); const weekStart = new Date(d.setUTCDate(diff)); return weekStart; }
function getNextWeekStart(date) { const currentWeekStart = getStartOfWeek(date); const nextWeekStartDate = new Date(currentWeekStart); nextWeekStartDate.setUTCDate(currentWeekStart.getUTCDate() + 7); return nextWeekStartDate; }

// --- Badge Definitions ---
const BADGE_TIERS = [ /* ... */ ];

// --- Nodemailer Configuration ---
let transporter;
console.log("[SERVER START] Configuring Nodemailer...");
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_FROM && process.env.EMAIL_TO) { /* ... */ }
else { console.warn('[SERVER START] Email configuration missing. Contact form disabled.'); transporter = null; }


async function connectDB() {
  console.log("[CONNECT DB] Attempting MongoDB connection...");
  if (!mongoUri) { console.error("[CONNECT DB] MONGODB_URI is not defined!"); throw new Error("MONGODB_URI is not defined!"); }
  const client = new MongoClient(mongoUri);
  try {
      await client.connect();
      db = client.db('positiveVibesDB');
      console.log('[CONNECT DB] MongoDB Connected successfully.');
      console.log("[CONNECT DB] Ensuring indexes...");
      await Promise.all([ /* ... index creation ... */ ]);
      console.log("[CONNECT DB] Indexes ensured.");
  } catch (err) { console.error("[CONNECT DB] MongoDB connection or index creation failed:", err); throw err; }
}

// --- Connect to DB and Start Server ---
console.log("[SERVER START] Calling connectDB()...");
connectDB().then(() => {
  console.log("[SERVER START] connectDB() successful. Configuring session...");

  // --- Session Middleware ---
  app.use(session({
    secret: sessionSecret, resave: false, saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoUri, dbName: 'positiveVibesDB', collectionName: 'sessions', ttl: 14 * 24 * 60 * 60 }),
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax', maxAge: 14 * 24 * 60 * 60 * 1000 }
   }));
  console.log(`[SERVER START] Session middleware configured. Cookie secure flag: ${process.env.NODE_ENV === 'production'}`);

  // --- Authentication Middleware ---
  function isAuthenticated(req, res, next) { /* ... */ }

  // --- Routes ---
  console.log("[SERVER START] Defining routes...");

  app.post('/api/auth/signup', async (req, res) => { /* ... unchanged ... */ });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`[Login Attempt] Email: ${email}`); // Log attempt
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });
    try {
        const user = await db.collection('users').findOne({ email });
        if (!user || !user.passwordHash) {
            console.log(`[Login Failed] Invalid credentials for email: ${email}`);
            return res.status(401).json({ message: "Invalid email or password" });
        }
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
             console.log(`[Login Failed] Password mismatch for email: ${email}`);
             return res.status(401).json({ message: "Invalid email or password" });
        }

        // --- Temporarily removed regenerate for debugging ---
        // req.session.regenerate((err) => {
        //     if (err) { console.error("Session regeneration error:", err); return res.status(500).json({ message: "Server error during login" }); }
        //     req.session.userId = user._id.toString();
        //     req.session.email = user.email;
        //     console.log(`[Login Success] User ${user.email} logged in. Session REGENERATED. Session ID: ${req.session.id}, User ID stored: ${req.session.userId}`);
        //     console.log("[Login Success] Full session object after regenerate:", req.session);
        //     res.json({ message: "Login successful", user: { email: user.email } });
        // });
        // --- End of removed block ---

        // --- Direct session modification (temporary for debugging) ---
        req.session.userId = user._id.toString(); // Store user ID as string
        req.session.email = user.email; // Store email for convenience
        // Save session explicitly before sending response
        req.session.save((err) => {
             if (err) {
                 console.error("[Login Error] Failed to save session after setting user ID:", err);
                 return res.status(500).json({ message: "Server error saving session" });
             }
             console.log(`[Login Success] User ${user.email} logged in. Session SAVED. Session ID: ${req.session.id}, User ID stored: ${req.session.userId}`);
             console.log("[Login Success] Full session object after save:", JSON.stringify(req.session)); // Log full session
             // Set cookie and send response
             res.json({ message: "Login successful", user: { email: user.email } });
        });
        // --- End of direct modification ---

    } catch (error) { console.error("Login error:", error); res.status(500).json({ message: "Server error during login" }); }
  });

  app.post('/api/auth/logout', (req, res) => { /* ... unchanged ... */ });

  app.get('/api/auth/status', async (req, res) => {
    // Log the incoming session state *before* checking userId
    console.log(`[Status Check] Received request. Session ID: ${req.sessionID || 'None'}. Session userId: ${req.session ? req.session.userId : 'No session'}`);
    console.log("[Status Check] Full session object on arrival:", JSON.stringify(req.session)); // Log full session

    if (!req.session || !req.session.userId) {
        console.log("[Status Check] No active session found or userId missing.");
        return res.json({ loggedIn: false });
    }
    // If session and userId exist, proceed
    const userIdFromSession = req.session.userId;
    console.log(`[Status Check] Session valid. Checking status for user ID: ${userIdFromSession}`);
    try {
        let userObjectId; try { userObjectId = new ObjectId(userIdFromSession); } catch (idError) { console.error(`[Status Check] Invalid user ID format in session: ${userIdFromSession}`, idError); req.session.destroy(); return res.json({ loggedIn: false }); }
        const user = await db.collection('users').findOne( { _id: userObjectId }, { projection: { email: 1, currentStreak: 1, longestStreak: 1, lastVibeWeekStart: 1, badges: 1 } } );
        if (!user) { console.warn(`[Status Check] User data not found in DB for session user ID: ${userIdFromSession}. Destroying session.`); req.session.destroy(); return res.json({ loggedIn: false }); }
        console.log(`[Status Check] Found user data for ${user.email}`);
        // --- Streak and Badge Logic (as before) ---
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
        console.log(`[Status Check] Sending loggedIn: true for ${user.email}`);
        res.json({ loggedIn: true, email: user.email, lastVibeTimestamp: lastVibe ? lastVibe.createdAt.toISOString() : null, currentStreak: currentStreak, longestStreak: longestStreak, badges: userBadges, nextBadgeName: nextBadgeName, nextBadgeProgress: nextBadgeProgress });
      } catch (error) { console.error("[Status] Error fetching user status:", error); res.status(500).json({ loggedIn: false, message: "Error fetching status" }); }
  });

  app.post('/api/auth/forgot-password', async (req, res) => { /* ... unchanged ... */ });
  app.post('/api/auth/reset-password', async (req, res) => { /* ... unchanged ... */ });
  app.post('/api/vibes', isAuthenticated, async (req, res) => { /* ... unchanged ... */ });
  app.get('/api/stats', async (req, res) => { /* ... unchanged ... */ });
  app.get('/api/theme/current', async (req, res) => { /* ... unchanged ... */ });
  app.get('/api/map-data', async (req, res) => { /* ... unchanged ... */ });
  app.post('/api/contact', async (req, res) => { /* ... unchanged ... */ });

  console.log("[SERVER START] API routes defined.");

  // --- SPA fallback ---
  app.get('*', (req, res, next) => { /* ... unchanged ... */ });
  console.log("[SERVER START] SPA fallback configured.");

  // --- Error Handling Middleware ---
  app.use((err, req, res, next) => { /* ... unchanged ... */ });
  console.log("[SERVER START] Error handling middleware configured.");

  // --- Start Listening ---
  app.listen(PORT, () => { console.log(`[SERVER START] Server listening on port ${PORT}... Application should be LIVE.`); });

 }).catch(err => {
     console.error("[SERVER START] CRITICAL ERROR during startup (connectDB failed):", err);
     process.exit(1);
 });

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
// Assumes instrument.js is in the same directory as server.js
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) { // Only init in prod if DSN exists
    try {
        require("./instrument.js");
        console.log("[SERVER START] Sentry instrumentation loaded.");
    } catch(sentryError) {
        console.error("[SERVER START] Failed to load Sentry instrumentation:", sentryError);
    }
} else {
     console.log("[SERVER START] Sentry instrumentation skipped (NODE_ENV not production or SENTRY_DSN missing).");
}


const app = express();

// --- Trust Proxy Setting ---
app.set('trust proxy', 1);
console.log("[SERVER START] 'trust proxy' set.");

const PORT = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI;
const sessionSecret = process.env.SESSION_SECRET;
// --- Get Frontend URL from environment variable ---
const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${PORT}`; // Fallback for local dev
console.log(`[SERVER START] Using FRONTEND_URL: ${frontendUrl}`);

// --- Environment Variable Check ---
console.log(`[SERVER START] PORT configured: ${PORT}`);
console.log(`[SERVER START] NODE_ENV: ${process.env.NODE_ENV}`);
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
function getStartOfWeek(date) { /* ... */ }
function getNextWeekStart(date) { /* ... */ }

// --- Badge Definitions ---
const BADGE_TIERS = [ /* ... */ ];

// --- Nodemailer Configuration ---
let transporter;
console.log("[SERVER START] Configuring Nodemailer...");
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_FROM && process.env.EMAIL_TO) {
  transporter = nodemailer.createTransport({ /* ... */ });
  transporter.verify() /* ... */ ;
} else { /* ... */ }


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
  console.log("[SERVER START] connectDB() successful. Configuring routes...");

  // --- Session Middleware ---
  app.use(session({
    secret: sessionSecret, resave: false, saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoUri, dbName: 'positiveVibesDB', collectionName: 'sessions', ttl: 14 * 24 * 60 * 60 }),
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax', maxAge: 14 * 24 * 60 * 60 * 1000 }
   }));
  console.log(`[SERVER START] Session middleware configured. Cookie secure flag: ${process.env.NODE_ENV === 'production'}`);

  // --- Authentication Middleware ---
  function isAuthenticated(req, res, next) { /* ... */ }

  // --- Auth routes ---
  console.log("[SERVER START] Defining routes...");
  app.post('/api/auth/signup', async (req, res) => { /* ... */ });
  app.post('/api/auth/login', async (req, res) => { /* ... */ });
  app.post('/api/auth/logout', (req, res) => { /* ... */ });
  app.get('/api/auth/status', async (req, res) => { /* ... */ });

  // --- Forgot Password Route ---
  app.post('/api/auth/forgot-password', async (req, res) => {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email address is required." });
      if (!transporter) {
           console.error("[Forgot PW] Request received, but email transporter is not configured.");
           return res.json({ message: "If an account with that email exists, a password reset link has been sent." }); // Generic success
      }
      try {
          const user = await db.collection('users').findOne({ email });
          if (!user) {
              console.log(`[Forgot PW] Password reset requested for non-existent email: ${email}`);
              return res.json({ message: "If an account with that email exists, a password reset link has been sent." }); // Generic success
          }
          const token = crypto.randomBytes(32).toString('hex');
          const expires = new Date(Date.now() + 3600000); // 1 hour
          await db.collection('users').updateOne( { _id: user._id }, { $set: { resetPasswordToken: token, resetPasswordExpires: expires } } );

          // --- FIXED: Use FRONTEND_URL environment variable ---
          const resetLink = `${frontendUrl}/reset-password.html?token=${token}`;
          console.log(`[Forgot PW] Generated reset link: ${resetLink}`); // Log the generated link

          const mailOptions = { from: process.env.EMAIL_FROM, to: user.email, subject: 'Password Reset Request - Positive Vibes Project', text: `Link: ${resetLink}`, html: `<p><a href="${resetLink}">Reset Password Link</a> (Expires in 1 hour)</p>` };
          try {
              await transporter.sendMail(mailOptions);
              console.log(`[Forgot PW] Password reset email sent to ${user.email}`);
              res.json({ message: "If an account with that email exists, a password reset link has been sent." });
          } catch (emailError) {
              console.error("[Forgot PW] Error sending password reset email:", emailError); // Log specific email error
              res.json({ message: "If an account with that email exists, a password reset link has been sent." }); // Generic success to user
          }
      } catch (error) {
          console.error("[Forgot PW] Error in forgot password process:", error);
          res.json({ message: "If an account with that email exists, a password reset link has been sent." }); // Generic success
      }
  });

  app.post('/api/auth/reset-password', async (req, res) => { /* ... unchanged ... */ });


  // --- Vibes routes ---
  app.post('/api/vibes', isAuthenticated, async (req, res) => { /* ... unchanged ... */ });

  // --- Stats Route ---
  app.get('/api/stats', async (req, res) => { /* ... unchanged ... */ });
  // --- Theme Route ---
  app.get('/api/theme/current', async (req, res) => { /* ... unchanged ... */ });
  // --- Map Data Route ---
  app.get('/api/map-data', async (req, res) => { /* ... unchanged ... */ });

  // --- Contact Form Route ---
  app.post('/api/contact', async (req, res) => {
    const { message } = req.body;
    if (!message || message.trim().length === 0) return res.status(400).json({ message: "Message content cannot be empty." });
    if (!transporter) { console.error("[Contact] Contact form submitted, but email transporter is not configured."); return res.status(500).json({ message: "Message received, but server email configuration is incomplete." }); }
    let senderInfo = "An anonymous user"; let replyToEmail = undefined;
    if (req.session && req.session.userId && req.session.email) { // Check session exists
        senderInfo = `User ${req.session.email}`;
        replyToEmail = req.session.email;
    }
    const mailOptions = { from: process.env.EMAIL_FROM, to: process.env.EMAIL_TO, replyTo: replyToEmail, subject: `PVP Contact Form Message from ${senderInfo}`, text: `Sender: ${senderInfo}\n\nMessage:\n${message}`, html: `<p><b>Sender:</b> ${senderInfo}</p><p><b>Message:</b></p><pre>${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`, };
    try {
      let info = await transporter.sendMail(mailOptions);
      console.log('[Contact] Contact email sent successfully. Message ID: %s', info.messageId);
      res.json({ message: "Message sent successfully! Thank you." });
    } catch (error) {
      // --- FIXED: Log the specific error from Nodemailer ---
      console.error("[Contact] Error sending contact email via nodemailer:", error);
      res.status(500).json({ message: "Failed to send message due to a server error. Please try again later." });
    }
  });


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
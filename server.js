require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const geoip = require('geoip-lite');
const crypto = require('crypto');
const path = require('path');

const app = express();

// --- Trust Proxy Setting ---
app.set('trust proxy', 1);

// --- Environment Variables ---
const PORT = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI;
const sessionSecret = process.env.SESSION_SECRET;
const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
const emailConfig = {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    from: process.env.EMAIL_FROM,
};

if (!mongoUri || !sessionSecret) {
    console.error("FATAL ERROR: MONGODB_URI and/or SESSION_SECRET are missing!");
    process.exit(1);
}

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Database ---
let db;
async function connectDB() {
    const client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db('positiveVibesDB');
    console.log('Connected to MongoDB.');
}
connectDB().catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
});

// --- Session ---
app.use(
    session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: mongoUri }),
        cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax' },
    })
);

// --- Helpers ---
function getStartOfWeek(date) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1);
    return new Date(d.setUTCDate(diff));
}

function getNextWeekStart(date) {
    const currentWeekStart = getStartOfWeek(date);
    const nextWeekStartDate = new Date(currentWeekStart);
    nextWeekStartDate.setUTCDate(currentWeekStart.getUTCDate() + 7);
    return nextWeekStartDate;
}

function generateToken() {
    return crypto.randomBytes(20).toString('hex');
}

// --- Nodemailer ---
const transporter = nodemailer.createTransport(emailConfig);

// --- Routes ---

// Authentication
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, location } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        const user = {
            email,
            passwordHash: hash,
            location,
            currentStreak: 0,
            longestStreak: 0,
            lastVibeWeekStart: null,
            badges: [],
        };
        await db.collection('users').insertOne(user);
        res.json({ message: 'Signup successful!' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await db.collection('users').findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        req.session.userId = user._id.toString();
        res.json({ message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: 'Logout failed' });
        res.json({ message: 'Logout successful' });
    });
});

// Password Reset
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await db.collection('users').findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const token = generateToken();
        await db.collection('passwordResets').insertOne({
            email,
            token,
            expiresAt: new Date(Date.now() + 3600000), // 1 hour
        });

        const resetLink = `${frontendUrl}/reset-password.html?token=${token}`;
        await transporter.sendMail({
            from: emailConfig.from,
            to: email,
            subject: 'Password Reset',
            text: `Use this link to reset your password: ${resetLink}`,
        });

        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const resetRequest = await db.collection('passwordResets').findOne({ token });
        if (!resetRequest || resetRequest.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const hash = await bcrypt.hash(newPassword, 10);
        await db.collection('users').updateOne({ email: resetRequest.email }, { $set: { passwordHash: hash } });
        await db.collection('passwordResets').deleteOne({ token });

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Vibe
app.post('/api/vibes', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const userId = new ObjectId(req.session.userId);
        const user = await db.collection('users').findOne({ _id: userId });

        const now = new Date();
        const currentWeekStart = getStartOfWeek(now);

        if (user.lastVibeWeekStart && user.lastVibeWeekStart >= currentWeekStart) {
            const nextAvailableTimestamp = getNextWeekStart(currentWeekStart);
            return res.status(429).json({
                message: 'Vibe already pushed this week',
                nextAvailableTimestamp,
            });
        }

        // Update streaks and badges
        const lastWeekStart = new Date(currentWeekStart);
        lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);

        let currentStreak = user.currentStreak || 0;
        if (user.lastVibeWeekStart && user.lastVibeWeekStart >= lastWeekStart) {
            currentStreak += 1;
        } else {
            currentStreak = 1;
        }

        const longestStreak = Math.max(user.longestStreak || 0, currentStreak);

        await db.collection('users').updateOne(
            { _id: userId },
            {
                $set: { currentStreak, longestStreak, lastVibeWeekStart: currentWeekStart },
            }
        );

        res.json({
            message: 'Vibe pushed successfully!',
            nextAvailableTimestamp: getNextWeekStart(currentWeekStart),
        });
    } catch (error) {
        console.error('Vibe error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Map Data
app.get('/api/map-data', async (req, res) => {
    try {
        const vibes = await db.collection('vibes').aggregate([
            { $group: { _id: '$location', count: { $sum: 1 } } },
        ]).toArray();

        const mapData = vibes.map((v) => ({
            location: v._id,
            count: v.count,
        }));

        res.json(mapData);
    } catch (error) {
        console.error('Map data error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
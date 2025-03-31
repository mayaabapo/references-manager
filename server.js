const express = require("express");
const axios = require("axios");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 3000;

// Middleware setup
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.static("public"));

// Session configuration
app.use(session({
    secret: 'your_strong_secret_key_here', // Change this to a random string
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Demo users (in production, use a database)
const users = [
    {
        id: 1,
        username: 'admin123',
        password: bcrypt.hashSync('rVZq6xtp', 10) // Hashed password
    },
    {
        id: 2,
        username: 'user123',
        password: bcrypt.hashSync('rVZq6xtp', 10)
    }
];

// Authentication middleware
function checkAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized - Please login first' });
    }
    next();
}

// Routes
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    req.session.user = { 
        id: user.id, 
        username: user.username,
        loginTime: new Date()
    };
    
    res.json({ 
        success: true, 
        message: 'Login successful',
        user: { username: user.username }
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

app.get('/check-auth', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ authenticated: false });
    }
    res.json({ 
        authenticated: true,
        user: { username: req.session.user.username }
    });
});

// Protected API routes
app.get("/fetch-references", checkAuth, async (req, res) => {
    try {
        res.set("Cache-Control", "no-store");
        const randomOffset = Math.floor(Math.random() * 500);
        const response = await axios.get(
            `https://api.crossref.org/works?query=cannabis&rows=50&offset=${randomOffset}`
        );
        res.json(response.data.message.items);
    } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).json({ error: "Failed to fetch references" });
    }
});

app.post("/save-reference", checkAuth, (req, res) => {
    const reference = req.body;
    if (!savedReferences.find((ref) => ref.DOI === reference.DOI)) {
        savedReferences.push(reference);
    }
    res.json(savedReferences);
});

app.post("/delete-reference", checkAuth, (req, res) => {
    const { DOI } = req.body;
    savedReferences = savedReferences.filter((ref) => ref.DOI !== DOI);
    res.json({ success: true, message: "Reference deleted" });
});

app.post("/push-references", checkAuth, async (req, res) => {
    try {
        const newPushed = savedReferences.filter(
            (ref) => !pushedReferences.some((pushed) => pushed.DOI === ref.DOI)
        );
        pushedReferences = [...pushedReferences, ...newPushed];
        savedReferences = [];
        res.json({ 
            success: true, 
            message: `${newPushed.length} references pushed`,
            pushedCount: pushedReferences.length
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to push references" });
    }
});

app.get("/get-pushed-references", checkAuth, (req, res) => {
    res.json(pushedReferences);
});

app.post("/delete-all-pushed-references", checkAuth, (req, res) => {
    pushedReferences = [];
    res.json({ success: true, message: "All pushed references deleted" });
});

// With this:
app.get("/", (req, res) => {
    res.redirect('/login.html');
});

app.get("/index.html", checkAuth, (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Data storage (in-memory for demo)
let savedReferences = [];
let pushedReferences = [];

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Available users:`);
    users.forEach(user => {
        console.log(`- Username: ${user.username} | Password: ${user.password.replace(/./g, '*')}`);
    });
    console.log(`Demo credentials:`);
    console.log(`- admin / admin123`);
    console.log(`- user / user123`);
});
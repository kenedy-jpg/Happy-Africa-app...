
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const AWS = require('aws-sdk');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

// AWS S3 Setup
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const upload = multer({ storage: multer.memoryStorage() });

// --- MIDDLEWARE: VERIFY TOKEN ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AUTHENTICATION ---

app.post('/auth/signup', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;
    const hash = await bcrypt.hash(password, 10);
    
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password_hash, display_name) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, email, hash, username]
    );
    
    const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '45d' });
    res.json({ token, user: newUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'User creation failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '45d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- CONTENT FEED & VIDEOS ---

app.get('/api/feed', async (req, res) => {
  try {
    // Advanced query: Gets video + user info + counts
    const query = `
      SELECT v.*, 
             json_build_object(
               'id', u.id, 
               'username', u.username, 
               'avatarUrl', u.avatar_url, 
               'displayName', u.display_name,
               'coins', u.coins
             ) as user,
             (SELECT count(*)::int FROM comments c WHERE c.video_id = v.id) as comments,
             (SELECT count(*)::int FROM likes l WHERE l.video_id = v.id) as likes
      FROM videos v
      JOIN users u ON v.user_id = u.id
      ORDER BY v.created_at DESC
      LIMIT 20
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

app.post('/api/upload', authenticateToken, upload.single('video'), async (req, res) => {
  const { description, category, musicTrack } = req.body;
  const file = req.file;
  const userId = req.user.id;

  if (!file) return res.status(400).json({ error: 'No video file' });

  try {
    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `videos/${Date.now()}_${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    };
    
    const s3Result = await s3.upload(s3Params).promise();
    const videoUrl = s3Result.Location;

    const insertQuery = `
      INSERT INTO videos (user_id, url, description, category, music_track)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const dbResult = await pool.query(insertQuery, [userId, videoUrl, description, category, musicTrack]);
    
    // Return formatted video
    const newVideo = dbResult.rows[0];
    const userRes = await pool.query('SELECT id, username, avatar_url, display_name FROM users WHERE id = $1', [userId]);
    
    newVideo.user = {
        id: userRes.rows[0].id,
        username: userRes.rows[0].username,
        avatarUrl: userRes.rows[0].avatar_url,
        displayName: userRes.rows[0].display_name
    };

    res.json(newVideo);
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// --- SOCIAL INTERACTIONS ---

// Like/Unlike a Video
app.post('/api/videos/:id/like', authenticateToken, async (req, res) => {
    const videoId = req.params.id;
    const userId = req.user.id;

    try {
        const check = await pool.query('SELECT * FROM likes WHERE user_id = $1 AND video_id = $2', [userId, videoId]);
        if (check.rows.length > 0) {
            // Unlike
            await pool.query('DELETE FROM likes WHERE user_id = $1 AND video_id = $2', [userId, videoId]);
            await pool.query('UPDATE videos SET likes_count = likes_count - 1 WHERE id = $1', [videoId]);
            res.json({ liked: false });
        } else {
            // Like
            await pool.query('INSERT INTO likes (user_id, video_id) VALUES ($1, $2)', [userId, videoId]);
            await pool.query('UPDATE videos SET likes_count = likes_count + 1 WHERE id = $1', [videoId]);
            res.json({ liked: true });
        }
    } catch (e) {
        console.error(e);
        res.status(500).send("Server error");
    }
});

// Add Comment
app.post('/api/videos/:id/comments', authenticateToken, async (req, res) => {
    const videoId = req.params.id;
    const userId = req.user.id;
    const { text } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO comments (user_id, video_id, text) VALUES ($1, $2, $3) RETURNING *',
            [userId, videoId, text]
        );
        // Add user details to response
        const userRes = await pool.query('SELECT username, avatar_url FROM users WHERE id = $1', [userId]);
        const comment = result.rows[0];
        comment.username = userRes.rows[0].username;
        comment.avatarUrl = userRes.rows[0].avatar_url;

        res.json(comment);
    } catch (e) {
        res.status(500).send("Server error");
    }
});

// Get Comments
app.get('/api/videos/:id/comments', async (req, res) => {
    const videoId = req.params.id;
    try {
        const query = `
            SELECT c.*, u.username, u.avatar_url as "avatarUrl"
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.video_id = $1
            ORDER BY c.created_at DESC
        `;
        const { rows } = await pool.query(query, [videoId]);
        res.json(rows);
    } catch (e) {
        res.status(500).send("Server error");
    }
});

// Follow User
app.post('/api/users/:id/follow', authenticateToken, async (req, res) => {
    const followerId = req.user.id;
    const followingId = req.params.id;

    if (followerId === followingId) return res.status(400).send("Cannot follow self");

    try {
        const check = await pool.query('SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
        
        if (check.rows.length > 0) {
            // Unfollow
            await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
            res.json({ following: false });
        } else {
            // Follow
            await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [followerId, followingId]);
            res.json({ following: true });
        }
    } catch (e) {
        res.status(500).send("Server error");
    }
});

// --- USER PROFILE ---

app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userRes = await pool.query('SELECT id, username, display_name, avatar_url, bio, coins FROM users WHERE id = $1', [id]);
        
        if (userRes.rows.length === 0) return res.status(404).send("User not found");
        
        const user = userRes.rows[0];
        // Calculate counts
        const followers = await pool.query('SELECT count(*)::int FROM follows WHERE following_id = $1', [id]);
        const following = await pool.query('SELECT count(*)::int FROM follows WHERE follower_id = $1', [id]);
        const likes = await pool.query('SELECT sum(likes_count)::int FROM videos WHERE user_id = $1', [id]);

        user.followers = followers.rows[0].count;
        user.following = following.rows[0].count;
        user.likes = likes.rows[0].sum || 0;

        res.json(user);
    } catch (e) {
        res.status(500).send("Server error");
    }
});

// Get User Videos
app.get('/api/users/:id/videos', async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM videos WHERE user_id = $1 ORDER BY created_at DESC', [id]);
        
        // Attach basic user object for frontend compatibility
        const userRes = await pool.query('SELECT id, username, avatar_url, display_name FROM users WHERE id = $1', [id]);
        const videos = rows.map(v => ({ ...v, user: userRes.rows[0] }));
        
        res.json(videos);
    } catch (e) {
        res.status(500).send("Server error");
    }
});

app.listen(port, () => {
  console.log(`Happy Africa Backend running on port ${port}`);
});
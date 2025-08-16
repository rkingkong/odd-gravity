require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const { z } = require('zod');
const { v4: uuidv4, validate: validateUUID } = require('uuid');

const PORT = parseInt(process.env.PORT || '8080', 10);
const app = express();
app.set('trust proxy', 1);

app.use(express.json({ limit: '100kb' }));
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

/** Utils **/
function seedFromUTCDate(d=new Date()) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth()+1).padStart(2,'0');
  const dd = String(d.getUTCDate()).padStart(2,'0');
  return Number(`${yyyy}${mm}${dd}`);
}
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
function pick(rng, list){ return list[Math.floor(rng()*list.length)]; }
function roundBetween(rng, min, max){ return Math.round(min + (max-min)*rng()); }

/** Routes **/
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post('/api/register', async (req, res) => {
  try {
    let { playerId } = req.body || {};
    if (playerId !== undefined && !validateUUID(playerId)) {
      return res.status(400).json({ error: 'Invalid playerId' });
    }
    if (!playerId) playerId = uuidv4();
    await pool.query('INSERT INTO players (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [playerId]);
    return res.json({ playerId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/daily', (_req, res) => {
  const seed = seedFromUTCDate(new Date());
  const rng = mulberry32(seed);
  const names = ['Classic','Chaotic','Bouncy','Inverted','Pulse','Flux','Odd Gravity'];
  const modeName = pick(rng, names);
  const gravityFlipEveryMs = roundBetween(rng, 2500, 3500);
  const obstacleSpeed = Math.round(2 + rng()*2); // 2–4
  const freezeDurationMs = roundBetween(rng, 450, 650);
  res.json({ seed, modeName, gravityFlipEveryMs, obstacleSpeed, freezeDurationMs });
});

app.post('/api/score', async (req, res) => {
  const schema = z.object({
    playerId: z.string().uuid(),
    score: z.number().int().min(0).max(1_000_000),
    modeName: z.string().trim().max(32).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const { playerId, score } = parsed.data;
  const modeName = (parsed.data.modeName || 'Classic').replace(/[^\w\s-]/g, '').slice(0,32);

  try {
    // Ensure player exists
    await pool.query('INSERT INTO players (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [playerId]);
    await pool.query(
      'INSERT INTO scores (player_id, score, mode_name) VALUES ($1,$2,$3)',
      [playerId, score, modeName]
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const period = (req.query.period || 'all').toString();
    const mode = (req.query.mode || 'any').toString();
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

    const params = [];
    let where = [];
    // Time window
    if (period === 'daily') {
      const d = new Date();
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0,0,0));
      params.push(start.toISOString());
      where.push(`created_at >= $${params.length}`);
    } else if (period === 'weekly') {
      const d = new Date();
      const day = d.getUTCDay(); // 0=Sun
      const mondayOffset = (day + 6) % 7; // days since Monday
      const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - mondayOffset, 0,0,0));
      params.push(monday.toISOString());
      where.push(`created_at >= $${params.length}`);
    }

    if (mode && mode !== 'any') {
      params.push(mode.slice(0,32));
      where.push(`mode_name = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit);

    const sql = `
      SELECT player_id,
             MAX(score) AS best_score,
             MAX(created_at) AS last_played,
             COALESCE(mode_name,'Classic') AS mode_name
      FROM scores
      ${whereSql}
      GROUP BY player_id, mode_name
      ORDER BY best_score DESC, last_played DESC
      LIMIT $${params.length};
    `;
    const { rows } = await pool.query(sql, params);
    return res.json({ items: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
});

// 404 for everything else under /api
app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});

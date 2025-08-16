require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
  const sql = `
  CREATE TABLE IF NOT EXISTS players(
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS scores(
    id BIGSERIAL PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    score INT CHECK (score >= 0),
    mode_name VARCHAR(32) DEFAULT 'Classic',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores (score DESC);
  CREATE INDEX IF NOT EXISTS idx_scores_created_at_desc ON scores (created_at DESC);
  `;
  try {
    await pool.query(sql);
    console.log('✅ Migrations applied.');
  } catch (e) {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

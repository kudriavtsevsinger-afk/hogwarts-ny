PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS rooms (
  code TEXT PRIMARY KEY,
  host_token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'prologue', 'archived')),
  max_players INTEGER NOT NULL DEFAULT 6 CHECK (max_players BETWEEN 3 AND 6),
  revision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  character_json TEXT,
  ready INTEGER NOT NULL DEFAULT 0 CHECK (ready IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_players_room_code ON players(room_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_room_name ON players(room_code, display_name COLLATE NOCASE);

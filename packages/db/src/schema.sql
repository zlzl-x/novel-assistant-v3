-- MVP SQLite schema，对齐 impl/step-02 与 md/08

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  protagonist_id TEXT,
  network_mode TEXT NOT NULL DEFAULT 'single' CHECK (network_mode IN ('single', 'ensemble')),
  genre TEXT NOT NULL DEFAULT 'generic',
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  raw_text TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  last_committed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, number)
);

CREATE INDEX IF NOT EXISTS idx_chapter_project ON chapters(project_id, number);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  disambiguation TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'mentioned',
  tier TEXT,
  is_network_center INTEGER NOT NULL DEFAULT 0,
  identity_current TEXT NOT NULL DEFAULT '',
  realm_current TEXT NOT NULL DEFAULT '',
  location_current TEXT NOT NULL DEFAULT '',
  faction_current TEXT,
  summary TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT,
  protagonist_relation_json TEXT,
  panel_json TEXT NOT NULL DEFAULT '{"entries":[]}',
  first_appearance_chapter_id TEXT,
  first_appearance_chapter_number INTEGER,
  last_appearance_chapter_id TEXT,
  last_appearance_chapter_number INTEGER,
  mention_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_character_name ON characters(project_id, name);

CREATE TABLE IF NOT EXISTS character_aliases (
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  PRIMARY KEY (character_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_character_aliases ON character_aliases(alias);

CREATE TABLE IF NOT EXISTS character_field_history (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  value TEXT NOT NULL,
  chapter_id TEXT,
  chapter_number INTEGER,
  source TEXT NOT NULL,
  excerpt TEXT,
  recognized_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS character_appearances (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  mention_count INTEGER NOT NULL DEFAULT 0,
  committed_at TEXT NOT NULL,
  excerpt TEXT,
  UNIQUE(character_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_character_appearances ON character_appearances(character_id, chapter_number);

CREATE TABLE IF NOT EXISTS character_relations (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT,
  strength INTEGER,
  since_chapter INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recognition_commits (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  committed_at TEXT NOT NULL,
  model_profile TEXT NOT NULL DEFAULT '',
  appearances_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS recognition_commit_fields (
  id TEXT PRIMARY KEY,
  commit_id TEXT NOT NULL REFERENCES recognition_commits(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  old_value TEXT NOT NULL DEFAULT '',
  new_value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS map_worlds (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  style_preset TEXT,
  generated_code TEXT,
  code_generated_at TEXT,
  code_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS map_nodes (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL REFERENCES map_worlds(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES map_nodes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  summary TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  geo_json TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS setting_modules (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  collapsed INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE audit ADD COLUMN IF NOT EXISTS proposal_snapshot jsonb;
CREATE TABLE IF NOT EXISTS research_runs (
  id text PRIMARY KEY,
  ondernemingsnr text NOT NULL REFERENCES records(ondernemingsnr),
  officer_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('running','completed','failed')),
  model text NOT NULL,
  prompt_version text NOT NULL,
  result jsonb,
  usage jsonb,
  error text,
  decision jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS research_runs_record_idx ON research_runs(ondernemingsnr);
CREATE UNIQUE INDEX IF NOT EXISTS research_one_active_record ON research_runs(ondernemingsnr) WHERE status='running';
CREATE UNIQUE INDEX IF NOT EXISTS research_one_active_officer ON research_runs(officer_id) WHERE status='running';
CREATE TABLE IF NOT EXISTS accepted_corrections (
  id text PRIMARY KEY,
  run_id text NOT NULL UNIQUE REFERENCES research_runs(id),
  ondernemingsnr text NOT NULL REFERENCES records(ondernemingsnr),
  field text NOT NULL CHECK (field IN ('straat','huisnr','postcode','gemeente','telefoon','email')),
  value text NOT NULL,
  medewerker text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Access is through the authenticated officer API only, not the public database API.
ALTER TABLE research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accepted_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit ENABLE ROW LEVEL SECURITY;

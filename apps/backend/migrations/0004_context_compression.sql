-- Add summary columns for 3-tier context compression
-- turns.summary: Rolling summary covering turn 1 through this turn
-- statements.summary: One-line summary of each statement for Tier 2 masking

ALTER TABLE turns ADD COLUMN summary TEXT;
ALTER TABLE statements ADD COLUMN summary TEXT;

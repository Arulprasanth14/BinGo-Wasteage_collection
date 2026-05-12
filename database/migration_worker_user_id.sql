-- ============================================================
-- BinGo DB Migration: Add worker_user_id to assignments table
-- Run this once against your bingo_db PostgreSQL database
-- ============================================================

-- Step 1: Add worker_user_id column (links assignments to users table)
ALTER TABLE assignments
    ADD COLUMN IF NOT EXISTS worker_user_id INT REFERENCES users(user_id) ON DELETE CASCADE;

-- Step 2 (Optional cleanup): If you had old worker_id entries from the
-- separate workers table and want to remove that column after migration:
-- ALTER TABLE assignments DROP COLUMN IF EXISTS worker_id;

-- ── Verify ────────────────────────────────────────────────────────────────────
-- Check the column was added:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'assignments';

-- ── How to manually create a test assignment ──────────────────────────────────
-- Replace 1 and 2 with actual pickup_id and worker's user_id:
-- INSERT INTO assignments (pickup_id, worker_user_id) VALUES (1, 2);
-- UPDATE pickups SET status = 'ASSIGNED' WHERE pickup_id = 1;

-- ── How to create a worker account ───────────────────────────────────────────
-- Workers are users with role='WORKER'. 
-- Either register via /register and manually UPDATE the role:
-- UPDATE users SET role = 'WORKER' WHERE email = 'worker@example.com';

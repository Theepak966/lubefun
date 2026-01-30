-- Migration: Add isBotFlip column to coinflip_games table
-- This allows bot-only flips to be clearly marked and prevents real users from joining them

ALTER TABLE `coinflip_games` 
ADD COLUMN `isBotFlip` tinyint(1) NOT NULL DEFAULT 0 
AFTER `server_seed`;

-- Add index for faster filtering of bot flips
CREATE INDEX `idx_isBotFlip` ON `coinflip_games` (`isBotFlip`);

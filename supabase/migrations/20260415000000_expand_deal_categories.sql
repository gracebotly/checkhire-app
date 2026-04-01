-- Expand deal categories from 6 to 9
-- Old: design, development, writing, marketing, virtual_assistant, other
-- New: web_dev, design, writing, video, marketing, virtual_assistant, audio, translation, other

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_category_check;

-- Step 2: Migrate existing data to new category values
UPDATE deals SET category = 'web_dev' WHERE category = 'development';
-- 'design' stays 'design'
-- 'writing' stays 'writing'
-- 'marketing' stays 'marketing'
-- 'virtual_assistant' stays 'virtual_assistant'
-- 'other' stays 'other'

-- Step 3: Add new CHECK constraint with all 9 categories
ALTER TABLE deals ADD CONSTRAINT deals_category_check
  CHECK (category IN ('web_dev', 'design', 'writing', 'video', 'marketing', 'virtual_assistant', 'audio', 'translation', 'other'));

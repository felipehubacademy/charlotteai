-- Renomeia source 'tip_of_day' → 'vocab_of_day' na constraint e nos dados existentes

-- 1. Atualiza dados existentes
UPDATE user_vocabulary SET source = 'vocab_of_day' WHERE source = 'tip_of_day';

-- 2. Remove constraint antiga
ALTER TABLE user_vocabulary DROP CONSTRAINT IF EXISTS user_vocabulary_source_check;

-- 3. Recria com novo valor
ALTER TABLE user_vocabulary
  ADD CONSTRAINT user_vocabulary_source_check
  CHECK (source IN ('manual','charlotte','learn_trail','vocab_of_day'));

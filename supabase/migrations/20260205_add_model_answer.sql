-- Add model answer columns to answer_feedback table
ALTER TABLE answer_feedback ADD COLUMN IF NOT EXISTS
  model_answer text;

ALTER TABLE answer_feedback ADD COLUMN IF NOT EXISTS
  model_answer_key_points text[] DEFAULT '{}';

ALTER TABLE answer_feedback ADD COLUMN IF NOT EXISTS
  model_answer_code_example text;

ALTER TABLE answer_feedback ADD COLUMN IF NOT EXISTS
  model_answer_model text;

ALTER TABLE answer_feedback ADD COLUMN IF NOT EXISTS
  model_answer_tokens integer;

ALTER TABLE answer_feedback ADD COLUMN IF NOT EXISTS
  model_answer_generated_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN answer_feedback.model_answer IS 'AI-generated exemplary answer for the question';
COMMENT ON COLUMN answer_feedback.model_answer_key_points IS 'Key points that should be mentioned in the answer';
COMMENT ON COLUMN answer_feedback.model_answer_code_example IS 'Optional code example for technical questions';
COMMENT ON COLUMN answer_feedback.model_answer_model IS 'AI model used to generate the answer (e.g., claude-sonnet-4)';
COMMENT ON COLUMN answer_feedback.model_answer_tokens IS 'Token count used for generation';
COMMENT ON COLUMN answer_feedback.model_answer_generated_at IS 'Timestamp when the model answer was generated';

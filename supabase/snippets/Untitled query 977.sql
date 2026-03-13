INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatar', 'avatar', true),
  ('post-image', 'post-image', true),
  ('post-videos', 'post-videos', true),
  ('messages', 'messages', true)
ON CONFLICT (id) DO NOTHING;
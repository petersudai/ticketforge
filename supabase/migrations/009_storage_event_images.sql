-- ══════════════════════════════════════════════════════════════════════
-- 009_storage_event_images.sql
-- Creates the event-images storage bucket.
-- Run in Supabase dashboard → SQL Editor.
-- ══════════════════════════════════════════════════════════════════════

-- Create the bucket (public = images load without auth tokens)
-- file_size_limit: 2 MB per image (2 * 1024 * 1024 bytes)
-- allowed_mime_types: jpeg, png, webp, gif only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone can read (public bucket)
CREATE POLICY "Public read event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

-- RLS: authenticated users can upload (organisers uploading event art)
CREATE POLICY "Authenticated upload event images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-images');

-- RLS: authenticated users can delete their own uploads
CREATE POLICY "Authenticated delete event images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-images');

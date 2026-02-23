
-- Create storage bucket for pill images
INSERT INTO storage.buckets (id, name, public) VALUES ('pill-images', 'pill-images', true);

-- Allow public read access
CREATE POLICY "Pill images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'pill-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload pill images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pill-images' AND auth.role() = 'authenticated');

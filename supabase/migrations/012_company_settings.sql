-- Create company_settings table (single-row settings)
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  contact_number TEXT NOT NULL DEFAULT '',
  vat_number TEXT NOT NULL DEFAULT '',
  whatsapp_link TEXT NOT NULL DEFAULT '',
  facebook_link TEXT NOT NULL DEFAULT '',
  tiktok_link TEXT NOT NULL DEFAULT '',
  youtube_link TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read company settings
CREATE POLICY "Authenticated users can read company_settings"
  ON company_settings FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update company_settings
CREATE POLICY "Authenticated users can insert company_settings"
  ON company_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update company_settings"
  ON company_settings FOR UPDATE TO authenticated USING (true);

-- Insert default row
INSERT INTO company_settings (company_name, logo_url, address, contact_number, vat_number, whatsapp_link, facebook_link, tiktok_link, youtube_link)
VALUES ('HardPro ERP', '', '', '', '', '', '', '', '')
ON CONFLICT DO NOTHING;

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company', 'company', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public reads of company bucket
CREATE POLICY "Public can read company bucket"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'company');

-- Allow authenticated users to upload/update company bucket
CREATE POLICY "Authenticated users can upload to company bucket"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company');

CREATE POLICY "Authenticated users can update company bucket"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company');

CREATE POLICY "Authenticated users can delete from company bucket"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company');

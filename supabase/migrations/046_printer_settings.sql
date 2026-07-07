CREATE TABLE IF NOT EXISTS printer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  printer_type TEXT NOT NULL DEFAULT 'tspl' CHECK (printer_type IN ('tspl', 'escpos', 'zpl')),
  device_path TEXT NOT NULL DEFAULT '/dev/usb/lp0',
  cups_queue TEXT NOT NULL DEFAULT 'GS-2406T',
  label_width NUMERIC NOT NULL DEFAULT 40,
  label_height NUMERIC NOT NULL DEFAULT 70,
  gap_height NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE printer_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read printer_settings"
    ON printer_settings FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert printer_settings"
    ON printer_settings FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update printer_settings"
    ON printer_settings FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

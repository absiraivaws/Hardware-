-- Phase 3: Delivery & Logistics Module

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  license_no TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read drivers"
  ON drivers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert drivers"
  ON drivers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update drivers"
  ON drivers FOR UPDATE TO authenticated USING (true);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_no TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL DEFAULT '',
  capacity TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read vehicles"
  ON vehicles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert vehicles"
  ON vehicles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles"
  ON vehicles FOR UPDATE TO authenticated USING (true);

-- Deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  delivery_no TEXT NOT NULL UNIQUE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read deliveries"
  ON deliveries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert deliveries"
  ON deliveries FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update deliveries"
  ON deliveries FOR UPDATE TO authenticated USING (true);

-- Delivery Items table
CREATE TABLE IF NOT EXISTS delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read delivery_items"
  ON delivery_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert delivery_items"
  ON delivery_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update delivery_items"
  ON delivery_items FOR UPDATE TO authenticated USING (true);

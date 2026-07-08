-- Auto-generate staff_code for new profiles
-- Generates codes in EMP-XXXX format (e.g., EMP-0001, EMP-0002)

CREATE OR REPLACE FUNCTION generate_staff_code()
RETURNS TRIGGER AS $$
DECLARE
  next_seq INT;
BEGIN
  IF NEW.staff_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(staff_code FROM 5) AS INTEGER)), 0) + 1
    INTO next_seq
    FROM profiles;
    NEW.staff_code := CONCAT('EMP-', LPAD(next_seq::TEXT, 4, '0'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_generate_staff_code ON profiles;

CREATE TRIGGER trg_profiles_generate_staff_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_staff_code();

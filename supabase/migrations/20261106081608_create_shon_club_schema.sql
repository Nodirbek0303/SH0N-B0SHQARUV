-- Core tables for SHON CLUB. Access is restricted to signed-in club staff.
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  price bigint NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS computers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'busy', 'broken')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('session', 'sale', 'purchase', 'expense', 'cash_in', 'cash_out')),
  title text NOT NULL,
  detail text NOT NULL DEFAULT '',
  amount bigint NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions (created_at DESC);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE computers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON products, computers, transactions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON products, computers, transactions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON products, computers, transactions TO authenticated;

DROP POLICY IF EXISTS "anon_insert_products" ON products;
DROP POLICY IF EXISTS "anon_update_products" ON products;
DROP POLICY IF EXISTS "anon_delete_products" ON products;
DROP POLICY IF EXISTS "authenticated_insert_products" ON products;
DROP POLICY IF EXISTS "authenticated_update_products" ON products;
DROP POLICY IF EXISTS "authenticated_delete_products" ON products;
CREATE POLICY "authenticated_select_products" ON products FOR SELECT TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_insert_products" ON products FOR INSERT TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_update_products" ON products FOR UPDATE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_delete_products" ON products FOR DELETE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');

DROP POLICY IF EXISTS "anon_insert_computers" ON computers;
DROP POLICY IF EXISTS "anon_update_computers" ON computers;
DROP POLICY IF EXISTS "anon_delete_computers" ON computers;
DROP POLICY IF EXISTS "authenticated_insert_computers" ON computers;
DROP POLICY IF EXISTS "authenticated_update_computers" ON computers;
DROP POLICY IF EXISTS "authenticated_delete_computers" ON computers;
CREATE POLICY "authenticated_select_computers" ON computers FOR SELECT TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_insert_computers" ON computers FOR INSERT TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_update_computers" ON computers FOR UPDATE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_delete_computers" ON computers FOR DELETE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
DROP POLICY IF EXISTS "authenticated_insert_transactions" ON transactions;
DROP POLICY IF EXISTS "authenticated_update_transactions" ON transactions;
DROP POLICY IF EXISTS "authenticated_delete_transactions" ON transactions;
CREATE POLICY "authenticated_select_transactions" ON transactions FOR SELECT TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_insert_transactions" ON transactions FOR INSERT TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_update_transactions" ON transactions FOR UPDATE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_delete_transactions" ON transactions FOR DELETE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');

-- Record product identity, quantity, and price at the time of each movement.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity integer CHECK (quantity IS NULL OR quantity > 0),
  ADD COLUMN IF NOT EXISTS unit_price bigint CHECK (unit_price IS NULL OR unit_price >= 0);
CREATE INDEX IF NOT EXISTS transactions_product_id_idx ON transactions (product_id);

-- Dashboard data is private and accessible only to signed-in club staff.
REVOKE ALL ON products, computers, transactions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON products, computers, transactions TO authenticated;

DROP POLICY IF EXISTS "anon_select_products" ON products;
DROP POLICY IF EXISTS "anon_insert_products" ON products;
DROP POLICY IF EXISTS "anon_update_products" ON products;
DROP POLICY IF EXISTS "anon_delete_products" ON products;
DROP POLICY IF EXISTS "anon_select_computers" ON computers;
DROP POLICY IF EXISTS "anon_insert_computers" ON computers;
DROP POLICY IF EXISTS "anon_update_computers" ON computers;
DROP POLICY IF EXISTS "anon_delete_computers" ON computers;
DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;

DROP POLICY IF EXISTS "authenticated_select_products" ON products;
DROP POLICY IF EXISTS "authenticated_insert_products" ON products;
DROP POLICY IF EXISTS "authenticated_update_products" ON products;
DROP POLICY IF EXISTS "authenticated_delete_products" ON products;
DROP POLICY IF EXISTS "authenticated_select_computers" ON computers;
DROP POLICY IF EXISTS "authenticated_insert_computers" ON computers;
DROP POLICY IF EXISTS "authenticated_update_computers" ON computers;
DROP POLICY IF EXISTS "authenticated_delete_computers" ON computers;
DROP POLICY IF EXISTS "authenticated_select_transactions" ON transactions;
DROP POLICY IF EXISTS "authenticated_insert_transactions" ON transactions;
DROP POLICY IF EXISTS "authenticated_update_transactions" ON transactions;
DROP POLICY IF EXISTS "authenticated_delete_transactions" ON transactions;

CREATE POLICY "authenticated_select_products" ON products FOR SELECT TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_insert_products" ON products FOR INSERT TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_update_products" ON products FOR UPDATE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_delete_products" ON products FOR DELETE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_select_computers" ON computers FOR SELECT TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_insert_computers" ON computers FOR INSERT TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_update_computers" ON computers FOR UPDATE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_delete_computers" ON computers FOR DELETE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_select_transactions" ON transactions FOR SELECT TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_insert_transactions" ON transactions FOR INSERT TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_update_transactions" ON transactions FOR UPDATE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');
CREATE POLICY "authenticated_delete_transactions" ON transactions FOR DELETE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');

-- Lock the product row and update stock plus ledger in a single transaction.
CREATE OR REPLACE FUNCTION record_product_movement(p_product_id uuid, p_quantity integer, p_kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_new_stock integer;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'club_role') IS DISTINCT FROM 'staff' THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF p_kind NOT IN ('sale', 'purchase') OR p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_MOVEMENT';
  END IF;

  SELECT * INTO v_product FROM products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF p_kind = 'purchase' AND v_product.stock > 2147483647 - p_quantity THEN
    RAISE EXCEPTION 'STOCK_LIMIT_EXCEEDED';
  END IF;
  v_new_stock := v_product.stock + CASE WHEN p_kind = 'sale' THEN -p_quantity ELSE p_quantity END;
  IF v_new_stock < 0 THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;

  UPDATE products SET stock = v_new_stock WHERE id = p_product_id;
  INSERT INTO transactions (kind, title, detail, amount, product_id, quantity, unit_price)
  VALUES (p_kind, CASE WHEN p_kind = 'sale' THEN 'Sotuv: ' ELSE 'Xarid: ' END || v_product.name,
    v_product.name, v_product.price * p_quantity, p_product_id, p_quantity, v_product.price);
END;
$$;
REVOKE ALL ON FUNCTION record_product_movement(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_product_movement(uuid, integer, text) TO authenticated;

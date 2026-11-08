ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price bigint NOT NULL DEFAULT 0;
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_cost_price_check,
  ADD CONSTRAINT products_cost_price_check CHECK (cost_price >= 0);

ALTER TABLE computers
  ADD COLUMN IF NOT EXISTS total_runtime_seconds bigint NOT NULL DEFAULT 0;
ALTER TABLE computers
  DROP CONSTRAINT IF EXISTS computers_total_runtime_seconds_check,
  ADD CONSTRAINT computers_total_runtime_seconds_check CHECK (total_runtime_seconds >= 0);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS unit_cost bigint CHECK (unit_cost IS NULL OR unit_cost >= 0),
  ADD COLUMN IF NOT EXISTS handled_by text,
  ADD COLUMN IF NOT EXISTS handled_as text;
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_kind_check,
  ADD CONSTRAINT transactions_kind_check
    CHECK (kind IN ('session', 'sale', 'purchase', 'expense', 'cash_in', 'cash_out', 'stock_opening', 'stock_adjustment'));
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_quantity_check,
  ADD CONSTRAINT transactions_quantity_check
    CHECK (quantity IS NULL OR (kind = 'stock_adjustment' AND quantity <> 0) OR (kind <> 'stock_adjustment' AND quantity > 0));
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_handled_as_check,
  ADD CONSTRAINT transactions_handled_as_check
    CHECK (handled_as IS NULL OR handled_as IN ('operator', 'manager'));

DROP FUNCTION IF EXISTS record_product_movement(uuid, integer, text);

UPDATE computers
SET name = 'Kompyuter ' || substring(name FROM 4)
WHERE name ~ '^PC-[0-9]+$'
  AND NOT EXISTS (
    SELECT 1 FROM computers AS existing
    WHERE existing.name = 'Kompyuter ' || substring(computers.name FROM 4)
  );

CREATE TABLE IF NOT EXISTS computer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  computer_id uuid NOT NULL REFERENCES computers(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds bigint,
  CONSTRAINT computer_sessions_duration_check CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CONSTRAINT computer_sessions_time_check CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX IF NOT EXISTS computer_sessions_computer_started_idx ON computer_sessions (computer_id, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS computer_sessions_one_active_per_computer_idx
  ON computer_sessions (computer_id) WHERE ended_at IS NULL;

ALTER TABLE computer_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON computer_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON computer_sessions TO authenticated;
DROP POLICY IF EXISTS "authenticated_select_computer_sessions" ON computer_sessions;
CREATE POLICY "authenticated_select_computer_sessions" ON computer_sessions
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'club_role') = 'staff');

REVOKE INSERT, UPDATE, DELETE ON products, computers, transactions FROM authenticated;
GRANT SELECT ON products, computers, transactions TO authenticated;

CREATE OR REPLACE FUNCTION add_computer(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'club_role') IS DISTINCT FROM 'staff' THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'INVALID_COMPUTER_NAME';
  END IF;

  INSERT INTO computers (name) VALUES (btrim(p_name)) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION save_product(
  p_id uuid,
  p_name text,
  p_price bigint,
  p_cost_price bigint,
  p_stock integer,
  p_handled_by text,
  p_handled_as text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_id uuid;
  v_delta integer;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'club_role') IS DISTINCT FROM 'staff' THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 100
    OR p_price IS NULL OR p_price < 1 OR p_price > 9007199254740991
    OR p_cost_price IS NULL OR p_cost_price < 1 OR p_cost_price > 9007199254740991
    OR p_stock IS NULL OR p_stock < 0
    OR p_handled_by IS NULL OR length(btrim(p_handled_by)) NOT BETWEEN 1 AND 60
    OR p_handled_as IS NULL OR p_handled_as NOT IN ('operator', 'manager') THEN
    RAISE EXCEPTION 'INVALID_PRODUCT';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO products (name, price, cost_price, stock)
    VALUES (btrim(p_name), p_price, p_cost_price, p_stock)
    RETURNING id INTO v_id;
    IF p_stock > 0 THEN
      INSERT INTO transactions (kind, title, detail, amount, product_id, quantity, unit_cost, handled_by, handled_as)
      VALUES ('stock_opening', 'Boshlang''ich qoldiq: ' || btrim(p_name), btrim(p_name), 0, v_id, p_stock, p_cost_price, btrim(p_handled_by), p_handled_as);
    END IF;
    RETURN v_id;
  END IF;

  SELECT * INTO v_product FROM products WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  v_delta := p_stock - v_product.stock;
  UPDATE products
  SET name = btrim(p_name), price = p_price, cost_price = p_cost_price, stock = p_stock
  WHERE id = p_id;
  IF v_delta <> 0 THEN
    INSERT INTO transactions (kind, title, detail, amount, product_id, quantity, unit_cost, handled_by, handled_as)
    VALUES ('stock_adjustment', 'Qoldiq tahriri: ' || btrim(p_name), btrim(p_name), 0, p_id, v_delta, p_cost_price, btrim(p_handled_by), p_handled_as);
  END IF;
  RETURN p_id;
END;
$$;

CREATE OR REPLACE FUNCTION record_product_movement(
  p_product_id uuid,
  p_quantity integer,
  p_kind text,
  p_handled_by text,
  p_handled_as text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_new_stock integer;
  v_unit_price bigint;
  v_amount numeric;
  v_balance numeric;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'club_role') IS DISTINCT FROM 'staff' THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('sale', 'purchase', 'stock_opening') OR p_quantity IS NULL OR p_quantity <= 0
    OR p_handled_by IS NULL OR length(btrim(p_handled_by)) NOT BETWEEN 1 AND 60
    OR p_handled_as IS NULL OR p_handled_as NOT IN ('operator', 'manager') THEN
    RAISE EXCEPTION 'INVALID_MOVEMENT';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('shon-club-cash-ledger', 0));
  SELECT * INTO v_product FROM products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF p_kind IN ('purchase', 'stock_opening') AND v_product.stock > 2147483647 - p_quantity THEN
    RAISE EXCEPTION 'STOCK_LIMIT_EXCEEDED';
  END IF;
  v_new_stock := v_product.stock + CASE WHEN p_kind = 'sale' THEN -p_quantity ELSE p_quantity END;
  IF v_new_stock < 0 THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;

  v_unit_price := CASE WHEN p_kind = 'sale' THEN v_product.price ELSE v_product.cost_price END;
  IF p_kind <> 'stock_opening' AND v_unit_price <= 0 THEN RAISE EXCEPTION 'INVALID_PRODUCT_PRICE'; END IF;
  v_amount := CASE WHEN p_kind = 'stock_opening' THEN 0 ELSE v_unit_price::numeric * p_quantity END;
  IF v_amount > 9007199254740991 THEN RAISE EXCEPTION 'AMOUNT_LIMIT_EXCEEDED'; END IF;
  IF p_kind = 'purchase' THEN
    SELECT COALESCE(SUM(
      CASE
        WHEN kind IN ('session', 'sale', 'cash_in') THEN amount
        WHEN kind IN ('purchase', 'expense', 'cash_out') THEN -amount
        ELSE 0
      END
    ), 0) INTO v_balance FROM transactions;
    IF v_balance < v_amount THEN RAISE EXCEPTION 'INSUFFICIENT_CASH'; END IF;
  END IF;

  UPDATE products SET stock = v_new_stock WHERE id = p_product_id;
  INSERT INTO transactions (kind, title, detail, amount, product_id, quantity, unit_price, unit_cost, handled_by, handled_as)
  VALUES (
    p_kind,
    CASE p_kind WHEN 'sale' THEN 'Sotuv: ' WHEN 'purchase' THEN 'Xarid: ' ELSE 'Omborga kirim: ' END || v_product.name,
    v_product.name,
    v_amount::bigint,
    p_product_id,
    p_quantity,
    CASE WHEN p_kind = 'stock_opening' THEN NULL ELSE v_unit_price END,
    CASE WHEN p_kind IN ('sale', 'stock_opening') THEN v_product.cost_price ELSE NULL END,
    btrim(p_handled_by),
    p_handled_as
  );
END;
$$;

CREATE OR REPLACE FUNCTION record_cash_transaction(
  p_kind text,
  p_amount bigint,
  p_detail text,
  p_handled_by text,
  p_handled_as text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_title text;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'club_role') IS DISTINCT FROM 'staff' THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('session', 'expense', 'cash_in', 'cash_out')
    OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 9007199254740991
    OR length(COALESCE(p_detail, '')) > 120
    OR p_handled_by IS NULL OR length(btrim(p_handled_by)) NOT BETWEEN 1 AND 60
    OR p_handled_as IS NULL OR p_handled_as NOT IN ('operator', 'manager') THEN
    RAISE EXCEPTION 'INVALID_CASH_TRANSACTION';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('shon-club-cash-ledger', 0));
  IF p_kind IN ('expense', 'cash_out') THEN
    SELECT COALESCE(SUM(
      CASE
        WHEN kind IN ('session', 'sale', 'cash_in') THEN amount
        WHEN kind IN ('purchase', 'expense', 'cash_out') THEN -amount
        ELSE 0
      END
    ), 0) INTO v_balance FROM transactions;
    IF v_balance < p_amount THEN RAISE EXCEPTION 'INSUFFICIENT_CASH'; END IF;
  END IF;

  v_title := CASE p_kind
    WHEN 'session' THEN 'Seans tushumi'
    WHEN 'expense' THEN 'Xarajat'
    WHEN 'cash_in' THEN 'Pul kiritish'
    ELSE 'Pul olish'
  END;
  INSERT INTO transactions (kind, title, detail, amount, handled_by, handled_as)
  VALUES (p_kind, v_title, COALESCE(btrim(p_detail), ''), p_amount, btrim(p_handled_by), p_handled_as);
END;
$$;

CREATE OR REPLACE FUNCTION set_computer_status(p_computer_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_computer computers%ROWTYPE;
  v_session computer_sessions%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_duration bigint;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'club_role') IS DISTINCT FROM 'staff' THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('free', 'busy', 'broken') THEN RAISE EXCEPTION 'INVALID_COMPUTER_STATUS'; END IF;

  SELECT * INTO v_computer FROM computers WHERE id = p_computer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'COMPUTER_NOT_FOUND'; END IF;
  IF v_computer.status = p_status THEN RETURN; END IF;

  IF v_computer.status = 'busy' THEN
    SELECT * INTO v_session FROM computer_sessions WHERE computer_id = p_computer_id AND ended_at IS NULL FOR UPDATE;
    IF FOUND THEN
      v_duration := GREATEST(0, floor(extract(epoch FROM (v_now - v_session.started_at)))::bigint);
      IF v_computer.total_runtime_seconds > 9007199254740991 - v_duration THEN
        RAISE EXCEPTION 'RUNTIME_LIMIT_EXCEEDED';
      END IF;
      UPDATE computer_sessions SET ended_at = v_now, duration_seconds = v_duration WHERE id = v_session.id;
      UPDATE computers SET status = p_status, total_runtime_seconds = total_runtime_seconds + v_duration WHERE id = p_computer_id;
      RETURN;
    END IF;
  END IF;

  IF p_status = 'busy' THEN
    INSERT INTO computer_sessions (computer_id, started_at) VALUES (p_computer_id, v_now);
  END IF;
  UPDATE computers SET status = p_status WHERE id = p_computer_id;
END;
$$;

NOTIFY pgrst, 'reload schema';

REVOKE ALL ON FUNCTION add_computer(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION save_product(uuid, text, bigint, bigint, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION record_product_movement(uuid, integer, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION record_cash_transaction(text, bigint, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION set_computer_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION add_computer(text) TO authenticated;
GRANT EXECUTE ON FUNCTION save_product(uuid, text, bigint, bigint, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION record_product_movement(uuid, integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION record_cash_transaction(text, bigint, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION set_computer_status(uuid, text) TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE products;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE computers;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE computer_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

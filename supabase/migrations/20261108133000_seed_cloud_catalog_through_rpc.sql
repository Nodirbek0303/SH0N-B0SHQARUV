CREATE OR REPLACE FUNCTION seed_club_defaults(p_products jsonb, p_computers jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'club_role') IS DISTINCT FROM 'staff' THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF jsonb_typeof(p_products) IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_computers) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_products) > 100
    OR jsonb_array_length(p_computers) > 100 THEN
    RAISE EXCEPTION 'INVALID_DEFAULTS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_products) AS product(name text, price bigint, cost_price bigint, stock integer)
    WHERE product.name IS NULL
      OR length(btrim(product.name)) NOT BETWEEN 1 AND 100
      OR product.price IS DISTINCT FROM 0
      OR product.cost_price IS DISTINCT FROM 0
      OR product.stock IS DISTINCT FROM 0
  ) THEN
    RAISE EXCEPTION 'INVALID_STARTER_PRODUCT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_computers) AS computer(name text)
    WHERE computer.name IS NULL
      OR length(btrim(computer.name)) NOT BETWEEN 1 AND 60
  ) THEN
    RAISE EXCEPTION 'INVALID_DEFAULT_COMPUTER';
  END IF;

  INSERT INTO products (name, price, cost_price, stock)
  SELECT btrim(product.name), 0, 0, 0
  FROM jsonb_to_recordset(p_products) AS product(name text, price bigint, cost_price bigint, stock integer)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO computers (name)
  SELECT btrim(computer.name)
  FROM jsonb_to_recordset(p_computers) AS computer(name text)
  ON CONFLICT (name) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION seed_club_defaults(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION seed_club_defaults(jsonb, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';

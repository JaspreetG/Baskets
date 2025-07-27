create or replace function create_basket_with_stocks(
  basket_name text,
  stock_list jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  basket_id uuid;
begin
  -- Insert basket and capture its ID
  insert into baskets (name, user_id)
  values (basket_name, auth.uid())
  returning id into basket_id;

  -- Loop through JSONB array and insert each stock
  insert into stocks (basket_id, symbol, name, quantity, buy_price, sell_price, sell_date)
  select
    basket_id,
    s->>'symbol',
    s->>'name',
    (s->>'quantity')::int,
    (s->>'buy_price')::numeric,
    nullif(s->>'sell_price', '')::numeric,
    nullif(s->>'sell_date', '')::date
  from jsonb_array_elements(stock_list) as s;

  return basket_id;
end;
$$;
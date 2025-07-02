create or replace function public.exit_basket(exit_basket jsonb)
returns void
language plpgsql
as $$
declare
  stock jsonb;
begin
  -- Ensure basket belongs to current user
  if not exists (
    select 1 from baskets
    where id = (exit_basket->>'basket_id')::uuid
    and user_id = auth.uid()
  ) then
    raise exception 'Unauthorized or basket not found';
  end if;

  -- Loop through each stock in the exit_basket and update its sell_price and sell_date
  for stock in
    select jsonb_array_elements(exit_basket->'stocks')
  loop
    update stocks
    set
      sell_price = (stock->>'sell_price')::numeric,
      sell_date = (exit_basket->>'sell_date')::date
    where basket_id = (exit_basket->>'basket_id')::uuid
      and symbol = stock->>'symbol';
  end loop;
end;
$$;
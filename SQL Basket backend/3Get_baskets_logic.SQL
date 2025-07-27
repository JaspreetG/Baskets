create or replace function public.get_all_baskets_with_stocks()
returns jsonb
language plpgsql
as $$
declare
  result jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'created_at', b.created_at,
      'stocks', (
        select jsonb_agg(
          jsonb_build_object(
            'symbol', s.symbol,
            'name', s.name,
            'quantity', s.quantity,
            'buy_price', s.buy_price,
            'sell_price', s.sell_price,
            'sell_date', s.sell_date
          )
        )
        from stocks s
        where s.basket_id = b.id
      )
    )
  )
  into result
  from baskets b
  where b.user_id = auth.uid();

  return result;
end;
$$;
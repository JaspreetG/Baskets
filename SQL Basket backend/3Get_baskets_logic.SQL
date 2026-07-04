create or replace function public.get_all_baskets_with_stocks()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  result jsonb;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'auth.uid() returned null';
  end if;

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
            'buy_time', s.buy_time,
            'sell_time', s.sell_time
          )
        )
        from stocks s
        where s.basket_id = b.id
      )
    )
  )
  into result
  from baskets b
  where b.user_id = current_user_id;

  return result;
end;
$$;

create or replace function public.delete_basket(basket_id uuid)
returns void
language plpgsql
as $$
begin
  -- Check that the basket belongs to the current user
  if not exists (
    select 1 from baskets
    where id = basket_id
      and user_id = auth.uid()
  ) then
    raise exception 'Unauthorized or basket not found';
  end if;

  -- Delete the basket (stocks will be deleted automatically via ON DELETE CASCADE)
  delete from baskets where id = basket_id;
end;
$$;
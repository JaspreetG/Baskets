-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Baskets table
CREATE TABLE baskets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  basket_id UUID REFERENCES baskets(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  buy_price NUMERIC NOT NULL,
  sell_price NUMERIC, -- NEW
  buy_time TIMESTAMP DEFAULT now(),
  sell_date DATE
);

ALTER TABLE baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

-- Baskets policy
CREATE POLICY "Users can access their own baskets"
ON baskets
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Stocks policy (inherits through basket)
CREATE POLICY "Users can access stocks through their baskets"
ON stocks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM baskets
    WHERE baskets.id = stocks.basket_id
    AND baskets.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM baskets
    WHERE baskets.id = stocks.basket_id
    AND baskets.user_id = auth.uid()
  )
);

create policy "User can update stocks through their basket"
on stocks
for update
using (
  exists (
    select 1 from baskets
    where baskets.id = stocks.basket_id
    and baskets.user_id = auth.uid()
  )
);
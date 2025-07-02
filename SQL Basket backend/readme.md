# 📊 Basket Investment Tracker – PostgreSQL Backend

This backend schema and logic powers a **Basket-based Investment Tracking App**, where users can create baskets, assign multiple stocks to them, and later “exit” baskets by setting sell prices and dates. All user actions are securely scoped via PostgreSQL’s **Row-Level Security (RLS)** to ensure data privacy.

---

## 🏗️ Database Schema

### 🧺 `baskets` Table

Stores investment baskets created by users.

```sql
CREATE TABLE baskets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

### 📈 `stocks` Table

Each basket can contain multiple stocks. Stocks store both buy and (optionally) sell details.

```sql
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  basket_id UUID REFERENCES baskets(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  buy_price NUMERIC NOT NULL,
  sell_price NUMERIC,
  buy_time TIMESTAMP DEFAULT now(),
  sell_date DATE
);
```

---

## 🔐 Row-Level Security (RLS)

### Enable RLS

```sql
ALTER TABLE baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
```

### Baskets Policy

Only the basket owner can access or modify their baskets:

```sql
CREATE POLICY "Users can access their own baskets"
  ON baskets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Stocks Policy

Users can access or update only stocks inside their own baskets:

```sql
CREATE POLICY "Users can access stocks through their baskets"
  ON stocks
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM baskets
    WHERE baskets.id = stocks.basket_id
      AND baskets.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM baskets
    WHERE baskets.id = stocks.basket_id
      AND baskets.user_id = auth.uid()
  ));

CREATE POLICY "User can update stocks through their basket"
  ON stocks
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM baskets
    WHERE baskets.id = stocks.basket_id
      AND baskets.user_id = auth.uid()
  ));
```

---

## ⚙️ Functions

### 📥 `create_basket_with_stocks`

Create a basket along with a list of initial stock purchases.

```sql
create or replace function create_basket_with_stocks(
  basket_name text,
  stock_list jsonb
) returns uuid
```

- Takes a basket name and a JSONB array of stock entries.
- Inserts the basket and associated stocks in one transaction.

---

### 📤 `exit_basket`

Update existing stocks with exit (sell) details such as price and date.

```sql
create or replace function public.exit_basket(exit_basket jsonb)
returns void
```

- Validates user ownership.
- Updates `sell_price` and `sell_date` for all stocks in the specified basket.

---

### 📦 `get_all_baskets_with_stocks`

Fetch all baskets and their stocks for the current user as a nested JSON object.

```sql
create or replace function public.get_all_baskets_with_stocks()
returns jsonb
```

Returns data in the following JSON format:

```json
[
  {
    "id": "uuid",
    "name": "My Basket",
    "created_at": "...",
    "stocks": [
      {
        "symbol": "AAPL",
        "quantity": 10,
        "buy_price": 150.0,
        "sell_price": null,
        "sell_date": null
      }
    ]
  }
]
```

]

---

## 📚 Dependencies

- Requires `uuid-ossp` extension for UUID generation:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## ✅ Security Summary

- Every operation is scoped to the current authenticated user (`auth.uid()`).
- Users can only view or modify their own baskets and stocks.
- Policies enforce secure data isolation using PostgreSQL RLS.

---

## 📦 Example Usage

### Create Basket

```sql
select create_basket_with_stocks(
  'Tech Portfolio',
  '[{"symbol":"AAPL","quantity":10,"buy_price":150},{"symbol":"GOOGL","quantity":5,"buy_price":2700}]'
);
```

### Exit Basket

```sql
select exit_basket(
  '{
    "basket_id": "basket-uuid",
    "sell_date": "2025-07-01",
    "stocks": [
      { "symbol": "AAPL", "sell_price": 180 },
      { "symbol": "GOOGL", "sell_price": 2900 }
    ]
  }'
);
```

---

-- Port de supabase/migrations/20261002000001_finance_tables.sql (personal-finances-v2).
-- Un solo usuario por archivo: sin user_id, RLS ni cifrado.
-- Fechas en TEXT: YYYY-MM-DD para días, ISO para instantes.

-- Una fila (id = 1). onboarded_at null = onboarding a medias.
CREATE TABLE finance_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  monthly_income INTEGER NOT NULL,
  payday INTEGER NOT NULL CHECK (payday BETWEEN 1 AND 31),
  onboarded_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE fixed_expenses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  is_investment INTEGER NOT NULL DEFAULT 0 CHECK (is_investment IN (0, 1)),
  -- Borrado lógico: los gastos viejos siguen apuntando al fijo.
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX fixed_expenses_one_investment
  ON fixed_expenses (is_investment)
  WHERE is_investment = 1 AND archived_at IS NULL;

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  budget INTEGER NOT NULL,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  spent_on TEXT NOT NULL,
  fixed_expense_id TEXT REFERENCES fixed_expenses (id),
  category_id TEXT REFERENCES categories (id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((fixed_expense_id IS NULL) <> (category_id IS NULL))
);

CREATE INDEX expenses_spent_on ON expenses (spent_on);
CREATE INDEX expenses_fixed ON expenses (fixed_expense_id);
CREATE INDEX expenses_category ON expenses (category_id);

-- Ingresos extra (bonos, trabajos sueltos). Solo suman en el ciclo de su fecha.
CREATE TABLE incomes (
  id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  received_on TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX incomes_received_on ON incomes (received_on);

-- Una fila (id = 1).
CREATE TABLE investments (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  has_investments INTEGER NOT NULL DEFAULT 0 CHECK (has_investments IN (0, 1)),
  monthly_contribution INTEGER NOT NULL,
  total_balance INTEGER NOT NULL
);

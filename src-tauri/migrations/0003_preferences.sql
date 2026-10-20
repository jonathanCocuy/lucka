-- Amounts move to cents so dollars can hold $4.50.
-- Everything before this was whole pesos: x100 keeps every amount the same.
UPDATE finance_settings SET monthly_income = monthly_income * 100;
UPDATE fixed_expenses SET amount = amount * 100;
UPDATE categories SET budget = budget * 100;
UPDATE expenses SET amount = amount * 100;
UPDATE incomes SET amount = amount * 100;
UPDATE investments SET
  monthly_contribution = monthly_contribution * 100,
  total_balance = total_balance * 100;

-- One row (id = 1). No row = not chosen yet: the app uses the system language.
CREATE TABLE preferences (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  language TEXT NOT NULL CHECK (language IN ('en', 'es')),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'COP'))
);

-- Everyone before this used the app in Spanish and pesos.
INSERT INTO preferences (id, language, currency)
SELECT 1, 'es', 'COP' WHERE EXISTS (SELECT 1 FROM finance_settings);

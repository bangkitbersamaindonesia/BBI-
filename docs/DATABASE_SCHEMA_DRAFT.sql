-- BBI ERP: conceptual PostgreSQL draft (not an executed migration)
-- Monetary numbers use NUMERIC; proposed weighted average per SKU and warehouse.
-- Production schema will add complete approval, fiscal, taxes, attachments, linkage and authorization.

CREATE TABLE warehouses (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE product_styles (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT
);

CREATE TABLE product_variants (
  id UUID PRIMARY KEY,
  style_id UUID NOT NULL REFERENCES product_styles(id),
  sku TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (style_id, color, size)
);

CREATE TABLE stock_balances (
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  quantity NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  total_value NUMERIC(20,4) NOT NULL DEFAULT 0,
  version BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (warehouse_id, variant_id)
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  kind TEXT NOT NULL CHECK (kind IN ('receipt','delivery','transfer_in','transfer_out','return_in','return_out','adjustment')),
  quantity_delta NUMERIC(18,4) NOT NULL CHECK (quantity_delta <> 0),
  value_delta NUMERIC(20,4) NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_type,source_id,warehouse_id,variant_id,kind)
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY,
  entry_number TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','posted','reversed')),
  reversal_of UUID REFERENCES journal_entries(id),
  UNIQUE(source_type, source_id)
);

CREATE TABLE journal_lines (
  id UUID PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  debit NUMERIC(20,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(20,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

-- Required service-level invariants for production:
-- sum(journal_lines.debit)=sum(journal_lines.credit) at posting;
-- on-hand balance and weighted average maintained under row locks;
-- immutable posted documents, stock movements and journals;
-- fiscal period lock and transaction idempotency;
-- stronger movement uniqueness based on source line and event ID.

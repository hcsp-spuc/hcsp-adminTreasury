-- ============================================================
-- SPUC Treasury — Supabase Database Schema
-- ============================================================

-- Enable UUID extension (optional, using serial PKs to match ERD)
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. tbl_superadmin
-- ============================================================
CREATE TABLE tbl_superadmin (
  superadminID  SERIAL        PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  username      VARCHAR(50)   NOT NULL UNIQUE,
  password      TEXT          NOT NULL
);

-- ============================================================
-- 2. tbl_admin
-- ============================================================
CREATE TABLE tbl_admin (
  adminID       SERIAL        PRIMARY KEY,
  superadminID  INT           NOT NULL REFERENCES tbl_superadmin(superadminID) ON DELETE RESTRICT,
  missionID     INT           REFERENCES tbl_mission(missionID) ON DELETE SET NULL,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  username      VARCHAR(50)   NOT NULL UNIQUE,
  password      TEXT          NOT NULL,
  status        VARCHAR(20)   NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    DATE          NOT NULL DEFAULT CURRENT_DATE
);

-- ============================================================
-- 3. tbl_mission
-- ============================================================
CREATE TABLE tbl_mission (
  missionID   SERIAL        PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  address     TEXT,
  contactNo   VARCHAR(20),
  email       VARCHAR(150)
);

-- ============================================================
-- 4. tbl_fiscal_year
-- ============================================================
CREATE TABLE tbl_fiscal_year (
  yearID      SERIAL  PRIMARY KEY,
  year        INT     NOT NULL UNIQUE,
  start_date  DATE    NOT NULL,
  end_date    DATE    NOT NULL,
  CONSTRAINT chk_fiscal_dates CHECK (end_date > start_date)
);

-- ============================================================
-- 5. tbl_budget
-- ============================================================
CREATE TABLE tbl_budget (
  budgetID          SERIAL          PRIMARY KEY,
  missionID         INT             NOT NULL REFERENCES tbl_mission(missionID) ON DELETE CASCADE,
  yearID            INT             NOT NULL REFERENCES tbl_fiscal_year(yearID) ON DELETE RESTRICT,
  month             SMALLINT        NOT NULL CHECK (month BETWEEN 1 AND 12),
  tithe_budget      NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  offering_budget   NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  UNIQUE (missionID, yearID, month)
);

-- ============================================================
-- 6. tbl_tithes
-- ============================================================
CREATE TABLE tbl_tithes (
  tithesID      SERIAL          PRIMARY KEY,
  missionID     INT             NOT NULL REFERENCES tbl_mission(missionID) ON DELETE CASCADE,
  yearID        INT             NOT NULL REFERENCES tbl_fiscal_year(yearID) ON DELETE RESTRICT,
  month         SMALLINT        NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount        NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  date_recorded DATE            NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (missionID, yearID, month)
);

-- ============================================================
-- 7. tbl_offerings
-- ============================================================
CREATE TABLE tbl_offerings (
  offeringsID   SERIAL          PRIMARY KEY,
  missionID     INT             NOT NULL REFERENCES tbl_mission(missionID) ON DELETE CASCADE,
  yearID        INT             NOT NULL REFERENCES tbl_fiscal_year(yearID) ON DELETE RESTRICT,
  month         SMALLINT        NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount        NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  date_recorded DATE            NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (missionID, yearID, month)
);

-- ============================================================
-- 8. tbl_reconciliation
-- ============================================================
CREATE TABLE tbl_reconciliation (
  reconID       SERIAL          PRIMARY KEY,
  missionID     INT             NOT NULL REFERENCES tbl_mission(missionID) ON DELETE CASCADE,
  yearID        INT             NOT NULL REFERENCES tbl_fiscal_year(yearID) ON DELETE RESTRICT,
  ref_number    VARCHAR(50)     NOT NULL,
  date_received DATE            NOT NULL,
  description   TEXT,
  book_amount   NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  bank_amount   NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  difference    NUMERIC(15, 2)  GENERATED ALWAYS AS (bank_amount - book_amount) STORED,
  status        VARCHAR(20)     NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reconciled', 'discrepancy'))
);

-- ============================================================
-- 9. tbl_financial_stmt
-- ============================================================
CREATE TABLE tbl_financial_stmt (
  fsID                      SERIAL          PRIMARY KEY,
  yearID                    INT             NOT NULL REFERENCES tbl_fiscal_year(yearID) ON DELETE RESTRICT,
  month                     SMALLINT        NOT NULL CHECK (month BETWEEN 1 AND 12),
  tithes_received           NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  offerings_received        NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  other_income              NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  admin_expenses            NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  ministry_expenses         NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  education_expenses        NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  community_expenses        NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  remittance_to_division    NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  cash_beginning            NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  purchase_of_equipment     NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  proceeds_asset_disposal   NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  unrestricted_net_assets   NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  restricted_net_assets     NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  UNIQUE (yearID, month)
);

-- ============================================================
-- 10. tbl_reportHistory
-- ============================================================
CREATE TABLE tbl_reportHistory (
  historyID   SERIAL        PRIMARY KEY,
  adminID     INT           NOT NULL REFERENCES tbl_admin(adminID) ON DELETE RESTRICT,
  missionID   INT           REFERENCES tbl_mission(missionID) ON DELETE SET NULL,
  yearID      INT           REFERENCES tbl_fiscal_year(yearID) ON DELETE SET NULL,
  action      VARCHAR(255)  NOT NULL,
  date        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE tbl_superadmin    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_admin         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_mission       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_fiscal_year   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_budget        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_tithes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_offerings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_financial_stmt ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_reportHistory  ENABLE ROW LEVEL SECURITY;

-- Public read-only policy (for public viewer role)
-- Apply to tables the public viewer can see
CREATE POLICY "public_read_tithes"         ON tbl_tithes          FOR SELECT USING (true);
CREATE POLICY "public_read_offerings"      ON tbl_offerings        FOR SELECT USING (true);
CREATE POLICY "public_read_financial_stmt" ON tbl_financial_stmt   FOR SELECT USING (true);
CREATE POLICY "public_read_budget"         ON tbl_budget           FOR SELECT USING (true);
CREATE POLICY "public_read_fiscal_year"    ON tbl_fiscal_year      FOR SELECT USING (true);
CREATE POLICY "public_read_mission"        ON tbl_mission          FOR SELECT USING (true);

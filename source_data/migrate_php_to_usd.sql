-- ============================================================
-- Migration: Convert PHP donations to USD
-- Converts currency_code from 'PHP' to 'USD' and
-- impact_unit from 'pesos' to 'dollars' in dbo.donations
-- ============================================================

BEGIN TRANSACTION;

-- 1. Drop the existing CHECK constraint on impact_unit
ALTER TABLE dbo.donations
    DROP CONSTRAINT CK_donations_unit;

-- 2. Update currency_code from PHP to USD
UPDATE dbo.donations
SET currency_code = N'USD'
WHERE currency_code = N'PHP';

-- 3. Update impact_unit from pesos to dollars
UPDATE dbo.donations
SET impact_unit = N'dollars'
WHERE impact_unit = N'pesos';

-- 4. Re-create the CHECK constraint with 'dollars' instead of 'pesos'
ALTER TABLE dbo.donations
    ADD CONSTRAINT CK_donations_unit
    CHECK (impact_unit IS NULL OR impact_unit IN (N'dollars', N'items', N'hours', N'campaigns'));

COMMIT TRANSACTION;

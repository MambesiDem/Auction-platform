-- Sellers can now publish listings, so PUBLISHED must be an allowed status.
ALTER TABLE product_listings DROP CONSTRAINT IF EXISTS product_listings_status_check;
ALTER TABLE product_listings ADD CONSTRAINT product_listings_status_check
    CHECK (status IN ('DRAFT', 'PUBLISHED'));
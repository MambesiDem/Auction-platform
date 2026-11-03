-- Buy Now payments belong to a product order, not an auction.
ALTER TABLE payments ALTER COLUMN auction_id DROP NOT NULL;
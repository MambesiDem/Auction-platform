-- Buy Now deliveries belong to a product order, not an auction.
ALTER TABLE deliveries ALTER COLUMN auction_id DROP NOT NULL;
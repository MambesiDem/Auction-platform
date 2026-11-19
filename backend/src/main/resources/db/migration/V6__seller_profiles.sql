-- Seller profiles: the seller is no longer assumed to be a user account.

CREATE TABLE seller_profiles (
                                 id                       UUID PRIMARY KEY,
                                 version                  BIGINT NOT NULL DEFAULT 0,
                                 seller_type              VARCHAR(30) NOT NULL,
                                 display_name             VARCHAR(150) NOT NULL,
                                 slug                     VARCHAR(80) NOT NULL,
                                 status                   VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                                 verification_level       INTEGER NOT NULL DEFAULT 0,
                                 commission_rate_override DOUBLE PRECISION,
                                 created_at               TIMESTAMP NOT NULL,
                                 updated_at               TIMESTAMP NOT NULL,
                                 CONSTRAINT uq_seller_profiles_slug UNIQUE (slug)
);

CREATE TABLE seller_members (
                                id                UUID PRIMARY KEY,
                                seller_profile_id UUID NOT NULL REFERENCES seller_profiles (id),
                                user_id           UUID NOT NULL REFERENCES users (id),
                                role              VARCHAR(30) NOT NULL,
                                status            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                                created_at        TIMESTAMP NOT NULL,
                                CONSTRAINT uq_seller_members_profile_user UNIQUE (seller_profile_id, user_id)
);

CREATE INDEX idx_seller_members_user ON seller_members (user_id);

-- One individual profile for every user who sells, or who already appears as a seller.
CREATE TEMP TABLE _seller_backfill ON COMMIT DROP AS
SELECT u.id AS user_id,
       gen_random_uuid() AS profile_id,
       u.full_name,
       u.created_at
FROM users u
WHERE u.role = 'SELLER'
   OR u.id IN (SELECT owner_id FROM auction_items)
   OR u.id IN (SELECT seller_id FROM product_listings)
   OR u.id IN (SELECT seller_id FROM orders WHERE seller_id IS NOT NULL)
   OR u.id IN (SELECT seller_id FROM payments)
   OR u.id IN (SELECT seller_id FROM deliveries WHERE seller_id IS NOT NULL);

INSERT INTO seller_profiles
(id, seller_type, display_name, slug, status, verification_level, created_at, updated_at)
SELECT b.profile_id,
       'INDIVIDUAL',
    left(b.full_name, 150),
    concat_ws('-',
    nullif(trim(both '-' from left(
    regexp_replace(lower(b.full_name), '[^a-z0-9]+', '-', 'g'), 60)), ''),
    substr(b.profile_id::text, 1, 6)),
    'ACTIVE',
    0,
    b.created_at,
    now() AT TIME ZONE 'Africa/Johannesburg'
FROM _seller_backfill b;

INSERT INTO seller_members (id, seller_profile_id, user_id, role, status, created_at)
SELECT gen_random_uuid(), b.profile_id, b.user_id, 'OWNER', 'ACTIVE', b.created_at
FROM _seller_backfill b;

-- The profile becomes the owner of listings, auctions, orders, payments and deliveries.
ALTER TABLE product_listings ADD COLUMN seller_profile_id UUID REFERENCES seller_profiles (id);
ALTER TABLE auction_items    ADD COLUMN seller_profile_id UUID REFERENCES seller_profiles (id);
ALTER TABLE orders           ADD COLUMN seller_profile_id UUID REFERENCES seller_profiles (id);
ALTER TABLE payments         ADD COLUMN seller_profile_id UUID REFERENCES seller_profiles (id);
ALTER TABLE deliveries       ADD COLUMN seller_profile_id UUID REFERENCES seller_profiles (id);

UPDATE product_listings t SET seller_profile_id = b.profile_id
    FROM _seller_backfill b WHERE b.user_id = t.seller_id;

UPDATE auction_items t SET seller_profile_id = b.profile_id
    FROM _seller_backfill b WHERE b.user_id = t.owner_id;

UPDATE orders t SET seller_profile_id = b.profile_id
    FROM _seller_backfill b WHERE b.user_id = t.seller_id;

UPDATE payments t SET seller_profile_id = b.profile_id
    FROM _seller_backfill b WHERE b.user_id = t.seller_id;

UPDATE deliveries t SET seller_profile_id = b.profile_id
    FROM _seller_backfill b WHERE b.user_id = t.seller_id;

CREATE INDEX idx_product_listings_seller_profile ON product_listings (seller_profile_id);
CREATE INDEX idx_auction_items_seller_profile    ON auction_items (seller_profile_id);
CREATE INDEX idx_orders_seller_profile           ON orders (seller_profile_id);
CREATE INDEX idx_payments_seller_profile         ON payments (seller_profile_id);
CREATE INDEX idx_deliveries_seller_profile       ON deliveries (seller_profile_id);
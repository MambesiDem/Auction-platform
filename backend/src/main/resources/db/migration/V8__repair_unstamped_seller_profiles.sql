-- Repairs rows written without a seller profile, for example by the previous release
-- while the new one was starting.

-- 1. A seller who still has no profile but appears on an unstamped row gets one.
CREATE TEMP TABLE _orphan_sellers ON COMMIT DROP AS
SELECT u.id AS user_id, gen_random_uuid() AS profile_id, u.full_name, u.created_at
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM seller_members m WHERE m.user_id = u.id)
  AND (
    u.id IN (SELECT seller_id FROM orders WHERE seller_profile_id IS NULL AND seller_id IS NOT NULL)
        OR u.id IN (SELECT seller_id FROM payments WHERE seller_profile_id IS NULL)
        OR u.id IN (SELECT seller_id FROM deliveries WHERE seller_profile_id IS NULL AND seller_id IS NOT NULL)
        OR u.id IN (SELECT owner_id FROM auction_items WHERE seller_profile_id IS NULL)
        OR u.id IN (SELECT seller_id FROM product_listings WHERE seller_profile_id IS NULL)
    );

INSERT INTO seller_profiles
(id, seller_type, display_name, slug, status, verification_level, created_at, updated_at)
SELECT o.profile_id,
       'INDIVIDUAL',
    left(o.full_name, 150),
    concat_ws('-',
    nullif(trim(both '-' from left(
    regexp_replace(lower(o.full_name), '[^a-z0-9]+', '-', 'g'), 60)), ''),
    substr(o.profile_id::text, 1, 6)),
    'ACTIVE',
    0,
    o.created_at,
    now() AT TIME ZONE 'Africa/Johannesburg'
FROM _orphan_sellers o;

INSERT INTO seller_members (id, seller_profile_id, user_id, role, status, created_at)
SELECT gen_random_uuid(), o.profile_id, o.user_id, 'OWNER', 'ACTIVE', o.created_at
FROM _orphan_sellers o;

-- 2. An order takes the profile of the sale it belongs to.
UPDATE orders o SET seller_profile_id = a.seller_profile_id
    FROM auction_items a
WHERE o.seller_profile_id IS NULL AND o.auction_id = a.id AND a.seller_profile_id IS NOT NULL;

UPDATE orders o SET seller_profile_id = p.seller_profile_id
    FROM product_listings p
WHERE o.seller_profile_id IS NULL AND o.product_listing_id = p.id AND p.seller_profile_id IS NOT NULL;

-- 3. Everything else falls back to the seller's first active membership.
CREATE TEMP TABLE _first_profile_v8 ON COMMIT DROP AS
SELECT DISTINCT ON (user_id) user_id, seller_profile_id
FROM seller_members
WHERE status = 'ACTIVE'
ORDER BY user_id, created_at;

UPDATE product_listings t SET seller_profile_id = f.seller_profile_id
    FROM _first_profile_v8 f WHERE t.seller_profile_id IS NULL AND f.user_id = t.seller_id;

UPDATE auction_items t SET seller_profile_id = f.seller_profile_id
    FROM _first_profile_v8 f WHERE t.seller_profile_id IS NULL AND f.user_id = t.owner_id;

UPDATE orders t SET seller_profile_id = f.seller_profile_id
    FROM _first_profile_v8 f WHERE t.seller_profile_id IS NULL AND f.user_id = t.seller_id;

UPDATE payments t SET seller_profile_id = f.seller_profile_id
    FROM _first_profile_v8 f WHERE t.seller_profile_id IS NULL AND f.user_id = t.seller_id;

UPDATE deliveries t SET seller_profile_id = f.seller_profile_id
    FROM _first_profile_v8 f WHERE t.seller_profile_id IS NULL AND f.user_id = t.seller_id;
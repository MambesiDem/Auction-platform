-- Rows written after V6 but before the application filled in seller_profile_id.
CREATE TEMP TABLE _first_profile ON COMMIT DROP AS
SELECT DISTINCT ON (user_id) user_id, seller_profile_id
FROM seller_members
WHERE status = 'ACTIVE'
ORDER BY user_id, created_at;

UPDATE product_listings t SET seller_profile_id = f.seller_profile_id
    FROM _first_profile f WHERE t.seller_profile_id IS NULL AND f.user_id = t.seller_id;

UPDATE auction_items t SET seller_profile_id = f.seller_profile_id
    FROM _first_profile f WHERE t.seller_profile_id IS NULL AND f.user_id = t.owner_id;

UPDATE orders t SET seller_profile_id = f.seller_profile_id
    FROM _first_profile f WHERE t.seller_profile_id IS NULL AND f.user_id = t.seller_id;

UPDATE payments t SET seller_profile_id = f.seller_profile_id
    FROM _first_profile f WHERE t.seller_profile_id IS NULL AND f.user_id = t.seller_id;

UPDATE deliveries t SET seller_profile_id = f.seller_profile_id
    FROM _first_profile f WHERE t.seller_profile_id IS NULL AND f.user_id = t.seller_id;
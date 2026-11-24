CREATE TABLE addresses (
                           id              UUID PRIMARY KEY,
                           line1           VARCHAR(200) NOT NULL,
                           line2           VARCHAR(200),
                           suburb          VARCHAR(100) NOT NULL,
                           city            VARCHAR(100) NOT NULL,
                           province        VARCHAR(30)  NOT NULL,
                           postal_code     VARCHAR(10)  NOT NULL,
                           country         VARCHAR(2)   NOT NULL DEFAULT 'ZA',
                           latitude        NUMERIC(9,6),
                           longitude       NUMERIC(9,6),
                           location_source VARCHAR(20)  NOT NULL DEFAULT 'NONE',
                           instructions    VARCHAR(500),
                           created_at      TIMESTAMP    NOT NULL,
                           CONSTRAINT chk_addresses_coordinates CHECK (
                               (latitude IS NULL AND longitude IS NULL)
                                   OR (latitude IS NOT NULL AND longitude IS NOT NULL))
);

CREATE TABLE store_locations (
                                 id                   UUID PRIMARY KEY,
                                 version              BIGINT NOT NULL DEFAULT 0,
                                 seller_profile_id    UUID NOT NULL REFERENCES seller_profiles (id),
                                 address_id           UUID NOT NULL UNIQUE REFERENCES addresses (id),
                                 name                 VARCHAR(120) NOT NULL,
                                 phone                VARCHAR(20),
                                 opening_hours        VARCHAR(300),
                                 collection_available BOOLEAN NOT NULL DEFAULT FALSE,
                                 is_default           BOOLEAN NOT NULL DEFAULT FALSE,
                                 status               VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                                 created_at           TIMESTAMP NOT NULL,
                                 updated_at           TIMESTAMP NOT NULL
);

CREATE INDEX idx_store_locations_profile ON store_locations (seller_profile_id, status);

-- One default pickup location per profile.
CREATE UNIQUE INDEX uq_store_locations_default
    ON store_locations (seller_profile_id)
    WHERE is_default AND status = 'ACTIVE';

CREATE TABLE user_addresses (
                                id             UUID PRIMARY KEY,
                                version        BIGINT NOT NULL DEFAULT 0,
                                user_id        UUID NOT NULL REFERENCES users (id),
                                address_id     UUID NOT NULL UNIQUE REFERENCES addresses (id),
                                label          VARCHAR(60)  NOT NULL,
                                recipient_name VARCHAR(120) NOT NULL,
                                phone          VARCHAR(20)  NOT NULL,
                                is_default     BOOLEAN NOT NULL DEFAULT FALSE,
                                created_at     TIMESTAMP NOT NULL,
                                updated_at     TIMESTAMP NOT NULL
);

CREATE INDEX idx_user_addresses_user ON user_addresses (user_id);

CREATE UNIQUE INDEX uq_user_addresses_default
    ON user_addresses (user_id)
    WHERE is_default;
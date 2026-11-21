package com.mambesi.action.listing;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface ProductListingRepository
        extends JpaRepository<ProductListing, UUID> {

    Page<ProductListing> findBySellerId(UUID sellerId, Pageable pageable);

    Page<ProductListing> findBySellerProfileIdIn(Collection<UUID> profileIds, Pageable pageable);

    Page<ProductListing> findByStatus(ProductListing.Status status, Pageable pageable);

    // Row lock so two buyers cannot take the same last item at the same time.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from ProductListing p where p.id = :id")
    Optional<ProductListing> findByIdForUpdate(@Param("id") UUID id);
}
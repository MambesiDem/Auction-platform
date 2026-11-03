package com.mambesi.action.listing;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

import java.util.UUID;

public interface ProductListingRepository
        extends JpaRepository<ProductListing, UUID> {

    Page<ProductListing> findBySellerId(UUID sellerId, Pageable pageable);

    Page<ProductListing> findByStatus(ProductListing.Status status, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProductListing p WHERE p.id = :id")
    Optional<ProductListing> findByIdForUpdate(@Param("id") UUID id);

}
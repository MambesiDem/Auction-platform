package com.mambesi.action.listing;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProductListingRepository
        extends JpaRepository<ProductListing, UUID> {

    Page<ProductListing> findBySellerId(UUID sellerId, Pageable pageable);
}
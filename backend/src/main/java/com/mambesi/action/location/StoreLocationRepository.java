package com.mambesi.action.location;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StoreLocationRepository extends JpaRepository<StoreLocation, UUID> {

    @EntityGraph(attributePaths = {"address"})
    List<StoreLocation> findBySellerProfileIdAndStatusOrderByDefaultLocationDescCreatedAtAsc(
            UUID sellerProfileId, StoreLocation.Status status);

    @EntityGraph(attributePaths = {"address"})
    Optional<StoreLocation> findByIdAndSellerProfileId(UUID id, UUID sellerProfileId);

    long countBySellerProfileIdAndStatus(UUID sellerProfileId, StoreLocation.Status status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update StoreLocation l set l.defaultLocation = false where l.sellerProfile.id = :profileId")
    int clearDefault(@Param("profileId") UUID profileId);
}
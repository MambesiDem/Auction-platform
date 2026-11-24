package com.mambesi.action.location;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserAddressRepository extends JpaRepository<UserAddress, UUID> {

    @EntityGraph(attributePaths = {"address"})
    List<UserAddress> findByUserIdOrderByDefaultAddressDescCreatedAtAsc(UUID userId);

    @EntityGraph(attributePaths = {"address"})
    Optional<UserAddress> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update UserAddress a set a.defaultAddress = false where a.user.id = :userId")
    int clearDefault(@Param("userId") UUID userId);
}
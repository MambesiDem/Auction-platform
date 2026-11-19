package com.mambesi.action.seller;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SellerMemberRepository extends JpaRepository<SellerMember, UUID> {

    @EntityGraph(attributePaths = {"sellerProfile"})
    List<SellerMember> findByUserIdAndStatusOrderByCreatedAtAsc(UUID userId, SellerMember.Status status);
}
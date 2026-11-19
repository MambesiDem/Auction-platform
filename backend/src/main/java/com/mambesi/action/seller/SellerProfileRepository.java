package com.mambesi.action.seller;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SellerProfileRepository extends JpaRepository<SellerProfile, UUID> {

    boolean existsBySlug(String slug);
}
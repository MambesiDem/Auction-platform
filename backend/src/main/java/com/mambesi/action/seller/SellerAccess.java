package com.mambesi.action.seller;

import com.mambesi.action.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** The one place that answers "may this user act for this seller profile?". */
@Service
public class SellerAccess {

    private final SellerMemberRepository members;

    public SellerAccess(SellerMemberRepository members) {
        this.members = members;
    }

    /** Profiles the user is an active member of. */
    @Transactional(readOnly = true)
    public Set<UUID> profileIds(User user) {
        if (user == null) {
            return Set.of();
        }

        return members
                .findByUserIdAndStatusOrderByCreatedAtAsc(user.getId(), SellerMember.Status.ACTIVE)
                .stream()
                .map(member -> member.getSellerProfile().getId())
                .collect(Collectors.toUnmodifiableSet());
    }

    @Transactional(readOnly = true)
    public Optional<SellerMember> membership(User user, UUID profileId) {
        if (user == null || profileId == null) {
            return Optional.empty();
        }

        return members.findByUserIdAndSellerProfileIdAndStatus(
                user.getId(), profileId, SellerMember.Status.ACTIVE);
    }

    public boolean isMember(User user, UUID profileId) {
        return membership(user, profileId).isPresent();
    }

    public void requireListingManager(User user, UUID profileId) {
        boolean allowed = membership(user, profileId)
                .map(member -> member.getRole().canManageListings())
                .orElse(false);

        if (!allowed) {
            throw new SecurityException(
                    "You do not have permission to manage this seller's listings.");
        }
    }

    public void requireFulfiller(User user, UUID profileId) {
        boolean allowed = membership(user, profileId)
                .map(member -> member.getRole().canFulfil())
                .orElse(false);

        if (!allowed) {
            throw new SecurityException(
                    "You do not have permission to fulfil this seller's orders.");
        }
    }
}
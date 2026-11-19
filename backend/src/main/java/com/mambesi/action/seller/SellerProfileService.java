package com.mambesi.action.seller;

import com.mambesi.action.user.Role;
import com.mambesi.action.user.User;
import com.mambesi.action.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class SellerProfileService {

    public record ProfileView(
            UUID id,
            String displayName,
            String slug,
            String sellerType,
            String status,
            int verificationLevel,
            String memberRole
    ) {}

    private final SellerProfileRepository profiles;
    private final SellerMemberRepository members;
    private final UserRepository users;

    public SellerProfileService(SellerProfileRepository profiles,
                                SellerMemberRepository members,
                                UserRepository users) {
        this.profiles = profiles;
        this.members = members;
        this.users = users;
    }

    /** Gives the user a profile they own, unless they already belong to one. Safe to call twice. */
    @Transactional
    public SellerProfile ensureProfile(User user, SellerProfile.Type type) {
        List<SellerMember> existing = members.findByUserIdAndStatusOrderByCreatedAtAsc(
                user.getId(), SellerMember.Status.ACTIVE);

        if (!existing.isEmpty()) {
            return existing.get(0).getSellerProfile();
        }

        SellerProfile profile = new SellerProfile();
        profile.setSellerType(type == null ? SellerProfile.Type.INDIVIDUAL : type);
        profile.setDisplayName(user.getFullName());
        profile.setSlug(uniqueSlug(user.getFullName()));
        profile = profiles.save(profile);

        members.save(new SellerMember(
                profile,
                users.getReferenceById(user.getId()),
                SellerMember.Role.OWNER
        ));

        return profile;
    }

    /** The profiles the user can act for. A seller with none yet gets an individual profile. */
    @Transactional
    public List<ProfileView> mine(User user) {
        List<SellerMember> memberships = members.findByUserIdAndStatusOrderByCreatedAtAsc(
                user.getId(), SellerMember.Status.ACTIVE);

        if (memberships.isEmpty() && user.getRole() == Role.SELLER) {
            ensureProfile(user, SellerProfile.Type.INDIVIDUAL);
            memberships = members.findByUserIdAndStatusOrderByCreatedAtAsc(
                    user.getId(), SellerMember.Status.ACTIVE);
        }

        return memberships.stream()
                .map(member -> {
                    SellerProfile profile = member.getSellerProfile();
                    return new ProfileView(
                            profile.getId(),
                            profile.getDisplayName(),
                            profile.getSlug(),
                            profile.getSellerType().name(),
                            profile.getStatus().name(),
                            profile.getVerificationLevel(),
                            member.getRole().name()
                    );
                })
                .toList();
    }

    private String uniqueSlug(String name) {
        String base = Normalizer.normalize(name == null ? "" : name, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");

        if (base.length() > 60) {
            base = base.substring(0, 60).replaceAll("-+$", "");
        }
        if (base.isEmpty()) {
            base = "seller";
        }

        for (int attempt = 0; attempt < 20; attempt++) {
            String suffix = Integer.toHexString(ThreadLocalRandom.current().nextInt(0x1000, 0xFFFF));
            String candidate = base + "-" + suffix;
            if (!profiles.existsBySlug(candidate)) {
                return candidate;
            }
        }

        return base + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
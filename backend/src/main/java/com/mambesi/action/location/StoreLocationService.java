package com.mambesi.action.location;

import com.mambesi.action.seller.SellerAccess;
import com.mambesi.action.seller.SellerProfile;
import com.mambesi.action.seller.SellerProfileRepository;
import com.mambesi.action.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class StoreLocationService {

    public record LocationInput(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 20) String phone,
            @Size(max = 300) String openingHours,
            boolean collectionAvailable,
            @NotNull @Valid Addresses.Input address
    ) {}

    public record LocationView(
            UUID id,
            String name,
            String phone,
            String openingHours,
            boolean collectionAvailable,
            boolean isDefault,
            String status,
            Addresses.View address
    ) {}

    private final StoreLocationRepository locations;
    private final SellerProfileRepository profiles;
    private final SellerAccess sellerAccess;

    // Active locations allowed at each verification level. Level 0 is an unverified profile.
    @Value("${sellers.max-locations-by-level:1,3,20,100}")
    private int[] maxByLevel;

    public StoreLocationService(StoreLocationRepository locations,
                                SellerProfileRepository profiles,
                                SellerAccess sellerAccess) {
        this.locations = locations;
        this.profiles = profiles;
        this.sellerAccess = sellerAccess;
    }

    @Transactional(readOnly = true)
    public List<LocationView> list(User user, UUID profileId) {
        if (!sellerAccess.isMember(user, profileId)) {
            throw new SecurityException("You do not have access to this seller profile.");
        }

        return locations
                .findBySellerProfileIdAndStatusOrderByDefaultLocationDescCreatedAtAsc(
                        profileId, StoreLocation.Status.ACTIVE)
                .stream()
                .map(this::view)
                .toList();
    }

    @Transactional
    public LocationView create(User user, UUID profileId, LocationInput input) {
        sellerAccess.requireListingManager(user, profileId);

        SellerProfile profile = profiles.findById(profileId)
                .orElseThrow(() -> new IllegalArgumentException("Seller profile not found."));

        long active = locations.countBySellerProfileIdAndStatus(
                profileId, StoreLocation.Status.ACTIVE);
        int limit = limitFor(profile);

        if (active >= limit) {
            throw new IllegalArgumentException(
                    "This seller profile can have up to " + limit
                            + " active location" + (limit == 1 ? "" : "s")
                            + ". Archive one to add another.");
        }

        StoreLocation location = new StoreLocation();
        location.setSellerProfile(profile);

        Address address = new Address();
        Addresses.apply(address, input.address());
        location.setAddress(address);

        applyDetails(location, input);
        location.setDefaultLocation(active == 0);

        return view(locations.save(location));
    }

    @Transactional
    public LocationView update(User user, UUID profileId, UUID id, LocationInput input) {
        sellerAccess.requireListingManager(user, profileId);

        StoreLocation location = activeLocation(profileId, id);

        Addresses.apply(location.getAddress(), input.address());
        applyDetails(location, input);

        return view(locations.save(location));
    }

    @Transactional
    public LocationView makeDefault(User user, UUID profileId, UUID id) {
        sellerAccess.requireListingManager(user, profileId);

        // The bulk update runs first, then the location is loaded fresh.
        locations.clearDefault(profileId);

        StoreLocation location = activeLocation(profileId, id);
        location.setDefaultLocation(true);

        return view(locations.save(location));
    }

    @Transactional
    public void archive(User user, UUID profileId, UUID id) {
        sellerAccess.requireListingManager(user, profileId);

        StoreLocation location = locations.findByIdAndSellerProfileId(id, profileId)
                .orElseThrow(() -> new IllegalArgumentException("Location not found."));

        if (location.getStatus() == StoreLocation.Status.ARCHIVED) {
            return;
        }

        boolean wasDefault = location.isDefaultLocation();

        location.setStatus(StoreLocation.Status.ARCHIVED);
        location.setDefaultLocation(false);
        locations.saveAndFlush(location);

        if (wasDefault) {
            locations
                    .findBySellerProfileIdAndStatusOrderByDefaultLocationDescCreatedAtAsc(
                            profileId, StoreLocation.Status.ACTIVE)
                    .stream()
                    .findFirst()
                    .ifPresent(next -> {
                        next.setDefaultLocation(true);
                        locations.save(next);
                    });
        }
    }

    private StoreLocation activeLocation(UUID profileId, UUID id) {
        StoreLocation location = locations.findByIdAndSellerProfileId(id, profileId)
                .orElseThrow(() -> new IllegalArgumentException("Location not found."));

        if (location.getStatus() != StoreLocation.Status.ACTIVE) {
            throw new IllegalArgumentException("This location is archived.");
        }

        return location;
    }

    private void applyDetails(StoreLocation location, LocationInput input) {
        location.setName(input.name().trim());
        location.setPhone(blankToNull(input.phone()));
        location.setOpeningHours(blankToNull(input.openingHours()));
        location.setCollectionAvailable(input.collectionAvailable());
    }

    private int limitFor(SellerProfile profile) {
        int level = Math.max(0, profile.getVerificationLevel());
        return maxByLevel[Math.min(level, maxByLevel.length - 1)];
    }

    private LocationView view(StoreLocation location) {
        return new LocationView(
                location.getId(),
                location.getName(),
                location.getPhone(),
                location.getOpeningHours(),
                location.isCollectionAvailable(),
                location.isDefaultLocation(),
                location.getStatus().name(),
                Addresses.view(location.getAddress())
        );
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
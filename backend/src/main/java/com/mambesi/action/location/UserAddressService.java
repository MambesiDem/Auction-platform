package com.mambesi.action.location;

import com.mambesi.action.user.User;
import com.mambesi.action.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UserAddressService {

    public record Input(
            @NotBlank @Size(max = 60) String label,
            @NotBlank @Size(max = 120) String recipientName,
            @NotBlank @Pattern(regexp = "^\\+?[0-9 ]{9,15}$", message = "Enter a valid phone number.") String phone,
            @NotNull @Valid Addresses.Input address
    ) {}

    public record Item(
            UUID id,
            String label,
            String recipientName,
            String phone,
            boolean isDefault,
            Addresses.View address
    ) {}

    private final UserAddressRepository repository;
    private final UserRepository users;

    @Value("${addresses.max-per-user:10}")
    private int maxPerUser;

    public UserAddressService(UserAddressRepository repository, UserRepository users) {
        this.repository = repository;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<Item> list(User user) {
        return repository.findByUserIdOrderByDefaultAddressDescCreatedAtAsc(user.getId())
                .stream()
                .map(this::item)
                .toList();
    }

    @Transactional
    public Item create(User user, Input input) {
        long existing = repository.countByUserId(user.getId());

        if (existing >= maxPerUser) {
            throw new IllegalArgumentException(
                    "You can save up to " + maxPerUser + " addresses. Delete one to add another.");
        }

        UserAddress saved = new UserAddress();
        saved.setUser(users.getReferenceById(user.getId()));

        Address address = new Address();
        Addresses.apply(address, input.address());
        saved.setAddress(address);

        applyDetails(saved, input);
        saved.setDefaultAddress(existing == 0);

        return item(repository.save(saved));
    }

    @Transactional
    public Item update(User user, UUID id, Input input) {
        UserAddress saved = owned(user, id);

        Addresses.apply(saved.getAddress(), input.address());
        applyDetails(saved, input);

        return item(repository.save(saved));
    }

    @Transactional
    public Item makeDefault(User user, UUID id) {
        // The bulk update runs first, then the address is loaded fresh.
        repository.clearDefault(user.getId());

        UserAddress saved = owned(user, id);
        saved.setDefaultAddress(true);

        return item(repository.save(saved));
    }

    @Transactional
    public void delete(User user, UUID id) {
        UserAddress saved = owned(user, id);
        boolean wasDefault = saved.isDefaultAddress();

        repository.delete(saved);
        repository.flush();

        if (wasDefault) {
            repository.findByUserIdOrderByDefaultAddressDescCreatedAtAsc(user.getId())
                    .stream()
                    .findFirst()
                    .ifPresent(next -> {
                        next.setDefaultAddress(true);
                        repository.save(next);
                    });
        }
    }

    private UserAddress owned(User user, UUID id) {
        return repository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Address not found."));
    }

    private void applyDetails(UserAddress saved, Input input) {
        saved.setLabel(input.label().trim());
        saved.setRecipientName(input.recipientName().trim());
        saved.setPhone(input.phone().trim());
    }

    private Item item(UserAddress saved) {
        return new Item(
                saved.getId(),
                saved.getLabel(),
                saved.getRecipientName(),
                saved.getPhone(),
                saved.isDefaultAddress(),
                Addresses.view(saved.getAddress())
        );
    }
}
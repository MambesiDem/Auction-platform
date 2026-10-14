package com.mambesi.action.listing;

import com.mambesi.action.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/product-listings")
public class ProductListingController {

    private final ProductListingRepository listings;

    public ProductListingController(ProductListingRepository listings) {
        this.listings = listings;
    }

    public record CreateRequest(
            @NotBlank @Size(max = 200)
            String title,

            @NotBlank @Size(max = 10000)
            String description,

            @NotBlank @Size(max = 100)
            String category,

            @NotNull
            ProductListing.Condition condition,

            @NotNull
            @DecimalMin(value = "0.01")
            @Digits(integer = 17, fraction = 2)
            BigDecimal unitPrice,

            @NotNull @Min(1)
            Integer stockQuantity,

            @Size(max = 2000)
            String imageUrl
    ) {}

    public record View(
            UUID id,
            String saleFormat,
            String title,
            String description,
            String category,
            ProductListing.Condition condition,
            BigDecimal unitPrice,
            int stockQuantity,
            String imageUrl,
            ProductListing.Status status,
            LocalDateTime createdAt
    ) {}

    @PostMapping
    @Transactional
    public View create(
            @Valid @RequestBody CreateRequest request,
            Authentication authentication
    ) {
        User seller = (User) authentication.getPrincipal();

        ProductListing listing = new ProductListing();
        listing.setSeller(seller);
        listing.setTitle(request.title().trim());
        listing.setDescription(request.description().trim());
        listing.setCategory(request.category().trim());
        listing.setCondition(request.condition());
        listing.setUnitPrice(
                request.unitPrice().setScale(2, RoundingMode.UNNECESSARY)
        );
        listing.setStockQuantity(request.stockQuantity());
        listing.setImageUrl(
                request.imageUrl() == null || request.imageUrl().isBlank()
                        ? null
                        : request.imageUrl().trim()
        );

        return view(listings.save(listing));
    }

    @GetMapping("/mine")
    @Transactional(readOnly = true)
    public Page<View> mine(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException(
                    "Page must be zero or greater. Page size must be between 1 and 100."
            );
        }

        User seller = (User) authentication.getPrincipal();

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(
                        Sort.Order.desc("createdAt"),
                        Sort.Order.desc("id")
                )
        );

        return listings.findBySellerId(seller.getId(), pageable)
                .map(this::view);
    }

    private View view(ProductListing listing) {
        return new View(
                listing.getId(),
                "BUY_NOW",
                listing.getTitle(),
                listing.getDescription(),
                listing.getCategory(),
                listing.getCondition(),
                listing.getUnitPrice(),
                listing.getStockQuantity(),
                listing.getImageUrl(),
                listing.getStatus(),
                listing.getCreatedAt()
        );
    }
}
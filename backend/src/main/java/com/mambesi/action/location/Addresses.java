package com.mambesi.action.location;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

/** Request and response shapes for addresses, with the rules every address must meet. */
public final class Addresses {

    private Addresses() {}

    private static final List<String> PROVINCES = List.of(
            "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
            "Mpumalanga", "Northern Cape", "North West", "Western Cape");

    public record Input(
            @NotBlank @Size(max = 200) String line1,
            @Size(max = 200) String line2,
            @NotBlank @Size(max = 100) String suburb,
            @NotBlank @Size(max = 100) String city,
            @NotBlank @Size(max = 30) String province,
            @NotBlank @Pattern(regexp = "\\d{4}", message = "Postal code must be 4 digits.") String postalCode,
            BigDecimal latitude,
            BigDecimal longitude,
            @Size(max = 500) String instructions
    ) {}

    public record View(
            UUID id,
            String line1,
            String line2,
            String suburb,
            String city,
            String province,
            String postalCode,
            BigDecimal latitude,
            BigDecimal longitude,
            String instructions
    ) {}

    public static void apply(Address target, Input in) {
        String province = PROVINCES.stream()
                .filter(name -> name.equalsIgnoreCase(in.province().trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Choose a South African province."));

        boolean hasLatitude = in.latitude() != null;
        boolean hasLongitude = in.longitude() != null;

        if (hasLatitude != hasLongitude) {
            throw new IllegalArgumentException(
                    "Provide both latitude and longitude, or neither.");
        }

        if (hasLatitude) {
            double latitude = in.latitude().doubleValue();
            double longitude = in.longitude().doubleValue();

            if (latitude < -35.0 || latitude > -21.5 || longitude < 16.0 || longitude > 33.5) {
                throw new IllegalArgumentException(
                        "The map position is outside South Africa. "
                                + "Check that latitude and longitude are not swapped.");
            }
        }

        target.setLine1(in.line1().trim());
        target.setLine2(blankToNull(in.line2()));
        target.setSuburb(in.suburb().trim());
        target.setCity(in.city().trim());
        target.setProvince(province);
        target.setPostalCode(in.postalCode().trim());
        target.setCountry("ZA");
        target.setLatitude(hasLatitude ? in.latitude().setScale(6, RoundingMode.HALF_UP) : null);
        target.setLongitude(hasLongitude ? in.longitude().setScale(6, RoundingMode.HALF_UP) : null);
        target.setLocationSource(hasLatitude ? Address.Source.PIN : Address.Source.NONE);
        target.setInstructions(blankToNull(in.instructions()));
    }

    public static View view(Address address) {
        return new View(
                address.getId(),
                address.getLine1(),
                address.getLine2(),
                address.getSuburb(),
                address.getCity(),
                address.getProvince(),
                address.getPostalCode(),
                address.getLatitude(),
                address.getLongitude(),
                address.getInstructions()
        );
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
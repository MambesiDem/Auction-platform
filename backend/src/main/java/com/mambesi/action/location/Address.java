package com.mambesi.action.location;

import com.mambesi.action.common.AppTime;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "addresses")
public class Address {

    public enum Source { NONE, PIN, GEOCODED }

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 200)
    private String line1;

    @Column(length = 200)
    private String line2;

    @Column(nullable = false, length = 100)
    private String suburb;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(nullable = false, length = 30)
    private String province;

    @Column(nullable = false, length = 10)
    private String postalCode;

    @Column(nullable = false, length = 2)
    private String country = "ZA";

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Source locationSource = Source.NONE;

    @Column(length = 500)
    private String instructions;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = AppTime.now();
    }

    public Address() {}

    /** An independent copy. Orders will keep a copy so address edits never change past orders. */
    public Address copy() {
        Address copy = new Address();
        copy.line1 = line1;
        copy.line2 = line2;
        copy.suburb = suburb;
        copy.city = city;
        copy.province = province;
        copy.postalCode = postalCode;
        copy.country = country;
        copy.latitude = latitude;
        copy.longitude = longitude;
        copy.locationSource = locationSource;
        copy.instructions = instructions;
        return copy;
    }

    public UUID getId() { return id; }
    public String getLine1() { return line1; }
    public void setLine1(String value) { this.line1 = value; }
    public String getLine2() { return line2; }
    public void setLine2(String value) { this.line2 = value; }
    public String getSuburb() { return suburb; }
    public void setSuburb(String value) { this.suburb = value; }
    public String getCity() { return city; }
    public void setCity(String value) { this.city = value; }
    public String getProvince() { return province; }
    public void setProvince(String value) { this.province = value; }
    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String value) { this.postalCode = value; }
    public String getCountry() { return country; }
    public void setCountry(String value) { this.country = value; }
    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal value) { this.latitude = value; }
    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal value) { this.longitude = value; }
    public Source getLocationSource() { return locationSource; }
    public void setLocationSource(Source value) { this.locationSource = value; }
    public String getInstructions() { return instructions; }
    public void setInstructions(String value) { this.instructions = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
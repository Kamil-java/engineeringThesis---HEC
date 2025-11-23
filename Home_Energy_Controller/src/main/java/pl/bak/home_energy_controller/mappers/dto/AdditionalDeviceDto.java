package pl.bak.home_energy_controller.mappers.dto;

import java.time.Instant;

public class AdditionalDeviceDto {

    private Long id;
    private String name;
    private String category;
    private Double ratedPowerW;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;


    public AdditionalDeviceDto() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Double getRatedPowerW() {
        return ratedPowerW;
    }

    public void setRatedPowerW(Double ratedPowerW) {
        this.ratedPowerW = ratedPowerW;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
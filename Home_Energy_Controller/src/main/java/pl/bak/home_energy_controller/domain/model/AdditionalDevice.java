package pl.bak.home_energy_controller.domain.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "additional_devices")
public class AdditionalDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Nazwa urządzenia widoczna w UI.
     */
    @Column(name = "name", nullable = false)
    private String name;

    /**
     * Kategoria – np. "light", "pc", "tv" albo cokolwiek przyjmiesz na froncie.
     */
    @Column(name = "category")
    private String category;

    /**
     * Moc znamionowa w W – potrzebne do obliczeń energii.
     */
    @Column(name = "rated_power_w")
    private Double ratedPowerW;

    /**
     * Dodatkowy opis (np. "Lampa biurkowa", "Listwa przy TV").
     */
    @Column(name = "description")
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public AdditionalDevice() {
    }

    public Long getId() {
        return id;
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

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
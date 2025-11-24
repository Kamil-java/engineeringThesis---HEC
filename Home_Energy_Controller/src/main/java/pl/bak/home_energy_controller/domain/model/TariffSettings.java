package pl.bak.home_energy_controller.domain.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "tariff_settings")
public class TariffSettings {

    @Id
    private Long id = 1L;

    @Column(name = "net_rate_per_kwh", precision = 10, scale = 4)
    private BigDecimal netRatePerKwh;

    @Column(name = "gross_rate_per_kwh", precision = 10, scale = 4)
    private BigDecimal grossRatePerKwh;

    @Column(name = "vat_percent", precision = 5, scale = 2)
    private BigDecimal vatPercent;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    public void touchUpdateTime() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public BigDecimal getNetRatePerKwh() {
        return netRatePerKwh;
    }

    public void setNetRatePerKwh(BigDecimal netRatePerKwh) {
        this.netRatePerKwh = netRatePerKwh;
    }

    public BigDecimal getGrossRatePerKwh() {
        return grossRatePerKwh;
    }

    public void setGrossRatePerKwh(BigDecimal grossRatePerKwh) {
        this.grossRatePerKwh = grossRatePerKwh;
    }

    public BigDecimal getVatPercent() {
        return vatPercent;
    }

    public void setVatPercent(BigDecimal vatPercent) {
        this.vatPercent = vatPercent;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}

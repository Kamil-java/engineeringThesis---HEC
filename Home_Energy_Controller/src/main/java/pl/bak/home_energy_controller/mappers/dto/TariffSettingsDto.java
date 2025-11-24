package pl.bak.home_energy_controller.mappers.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class TariffSettingsDto {

    private BigDecimal netRatePerKwh;
    private BigDecimal grossRatePerKwh;
    private BigDecimal vatPercent;
    private Instant updatedAt;

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

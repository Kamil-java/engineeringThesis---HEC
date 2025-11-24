package pl.bak.home_energy_controller.mappers.dto;

import java.time.Instant;

public class DeviceSummaryDto {

    /**
     * ID z bazy. Uwaga: może się pokrywać między TUYA i ADDITIONAL,
     * dlatego jest też pole "source".
     */
    private Long id;

    /**
     * "TUYA" albo "ADDITIONAL"
     */
    private String source;

    private String name;
    private String category;
    private String model;
    private String ip;
    private Instant lastUpdate;
    private Instant createdAt;
    private Instant updatedAt;


    /**
     * online/offline tylko dla urządzeń z Tuya,
     * dla ADDITIONAL będzie null.
     */
    private Boolean online;

    /**
     * Moc znamionowa – dla Tuya z Device.ratedPowerW,
     * dla additional z AdditionalDevice.ratedPowerW.
     */
    private Double ratedPowerW;

    /**
     * Opis / bulbDescription / itp.
     */
    private String description;

    public DeviceSummaryDto() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
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

    public Boolean getOnline() {
        return online;
    }

    public void setOnline(Boolean online) {
        this.online = online;
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

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public Instant getLastUpdate() {
        return lastUpdate;
    }

    public void setLastUpdate(Instant lastUpdate) {
        this.lastUpdate = lastUpdate;
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
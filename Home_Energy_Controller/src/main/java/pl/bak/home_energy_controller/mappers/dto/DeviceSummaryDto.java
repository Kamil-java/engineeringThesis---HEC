package pl.bak.home_energy_controller.mappers.dto;

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
}
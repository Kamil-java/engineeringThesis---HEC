package pl.bak.home_energy_controller.mappers.dto;

public class BulbDetailsDto {

    private String bulbDescription;
    private Double ratedPowerW;

    public BulbDetailsDto() {
    }

    public String getBulbDescription() {
        return bulbDescription;
    }

    public void setBulbDescription(String bulbDescription) {
        this.bulbDescription = bulbDescription;
    }

    public Double getRatedPowerW() {
        return ratedPowerW;
    }

    public void setRatedPowerW(Double ratedPowerW) {
        this.ratedPowerW = ratedPowerW;
    }
}


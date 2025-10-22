package pl.bak.home_energy_controller.tariff;

public class EnergyRate {
    private String provider;
    private String tariff;
    private double dayPrice;      // price per kWh during the day
    private double nightPrice;    // price per kWh during the night
    private double fixedCharge;   // monthly fixed cost
    private String validFrom;
    private String validTo;

    public EnergyRate(String provider, String tariff, double dayPrice, double nightPrice, double fixedCharge, String validFrom, String validTo) {
        this.provider = provider;
        this.tariff = tariff;
        this.dayPrice = dayPrice;
        this.nightPrice = nightPrice;
        this.fixedCharge = fixedCharge;
        this.validFrom = validFrom;
        this.validTo = validTo;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getTariff() {
        return tariff;
    }

    public void setTariff(String tariff) {
        this.tariff = tariff;
    }

    public double getDayPrice() {
        return dayPrice;
    }

    public void setDayPrice(double dayPrice) {
        this.dayPrice = dayPrice;
    }

    public double getNightPrice() {
        return nightPrice;
    }

    public void setNightPrice(double nightPrice) {
        this.nightPrice = nightPrice;
    }

    public double getFixedCharge() {
        return fixedCharge;
    }

    public void setFixedCharge(double fixedCharge) {
        this.fixedCharge = fixedCharge;
    }

    public String getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(String validFrom) {
        this.validFrom = validFrom;
    }

    public String getValidTo() {
        return validTo;
    }

    public void setValidTo(String validTo) {
        this.validTo = validTo;
    }
}



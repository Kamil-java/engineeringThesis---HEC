package pl.bak.home_energy_controller.tariff;

import org.springframework.stereotype.Service;

@Service
public class EnergyCostCalculator {

    private final EnergyRateService energyRateService;

    public EnergyCostCalculator(EnergyRateService energyRateService) {
        this.energyRateService = energyRateService;
    }

    /**
     * Calculates the estimated monthly cost for a given energy consumption (in kWh).
     */
    public double calculateMonthlyCost(double energyKwh, String tariff) {
        EnergyRate rate = energyRateService.getRateByTariff(tariff);
        if (rate == null) {
            throw new RuntimeException("Tariff not found: " + tariff);
        }

        double variableCost = energyKwh * rate.getDayPrice();
        double fixedCost = rate.getFixedCharge() / 30.0; // approximate daily share

        return variableCost + fixedCost;
    }
}

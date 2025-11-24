package pl.bak.home_energy_controller.billing;

import pl.bak.home_energy_controller.config.TariffProperties;
import pl.bak.home_energy_controller.domain.dao.AdditionalDeviceRepository;
import pl.bak.home_energy_controller.domain.dao.DeviceRepository;
import pl.bak.home_energy_controller.domain.dao.EnergyMeasurementRepository;
import pl.bak.home_energy_controller.domain.dao.LightingUsageRepository;
import pl.bak.home_energy_controller.domain.model.AdditionalDevice;
import pl.bak.home_energy_controller.domain.model.Device;
import pl.bak.home_energy_controller.domain.model.EnergyMeasurement;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pl.bak.home_energy_controller.domain.model.LightingUsage;
import pl.bak.home_energy_controller.domain.service.TariffSettingsService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class EnergyCostService {

    private final EnergyMeasurementRepository energyMeasurementRepository;
    private final DeviceRepository deviceRepository;
    private final TariffSettingsService tariffSettingsService;
    private final LightingUsageRepository lightingUsageRepository;
    private final AdditionalDeviceRepository additionalDeviceRepository;


    public EnergyCostService(EnergyMeasurementRepository energyMeasurementRepository,
                             DeviceRepository deviceRepository,
                             LightingUsageRepository lightingUsageRepository,
                             AdditionalDeviceRepository additionalDeviceRepository,
                             TariffSettingsService tariffSettingsService) {
        this.energyMeasurementRepository = energyMeasurementRepository;
        this.deviceRepository = deviceRepository;
        this.lightingUsageRepository = lightingUsageRepository;
        this.additionalDeviceRepository = additionalDeviceRepository;
        this.tariffSettingsService = tariffSettingsService;
    }

    private BigDecimal getRatePerKwh() {
        // zawsze aktualna stawka brutto z ustawień
        return tariffSettingsService.getCurrentSettings().getGrossRatePerKwh();
    }

    public BigDecimal calculateEnergyKwhForDeviceBetween(Long deviceId,
                                                         Instant from,
                                                         Instant to) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));

        List<EnergyMeasurement> measurements =
                energyMeasurementRepository.findByDeviceAndMeasuredAtBetweenOrderByMeasuredAt(
                        device, from, to
                );

        if (measurements.isEmpty()) {
            return BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        }

        BigDecimal total = BigDecimal.ZERO;
        Double prevVal = null;

        for (EnergyMeasurement em : measurements) {
            Double val = em.getEnergyKwh(); // tu siedzi nasz "add_ele" po przeliczeniu
            if (val == null) continue;

            if (prevVal != null) {
                double diff = val - prevVal;

                if (diff >= 0.0) {
                    // normalny przyrost licznika
                    total = total.add(BigDecimal.valueOf(diff));
                } else {
                    // licznik się zresetował (np. restart gniazdka)
                    // najprostsze podejście: ignorujemy ten skok w dół
                    // (ew. można dodać val jako nowy „segment” po resecie)
                }
            }

            prevVal = val;
        }

        return total.setScale(3, RoundingMode.HALF_UP);
    }

    /**
     * Łączny koszt w zadanym przedziale czasu.
     */
    public BigDecimal calculateCostForDeviceBetween(Long deviceId,
                                                    Instant from,
                                                    Instant to) {
        BigDecimal energyKwh = calculateEnergyKwhForDeviceBetween(deviceId, from, to);
        BigDecimal rate = getRatePerKwh();
        return energyKwh.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Średni pobór mocy [W] w zadanym okresie na podstawie energii [kWh].
     *
     * P_avg = (E[kWh] * 1000) / Δt[h]
     */
    public BigDecimal calculateAveragePowerWForPeriod(BigDecimal energyKwh,
                                                      Instant from,
                                                      Instant to) {
        long seconds = Duration.between(from, to).getSeconds();
        if (seconds <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal hours = BigDecimal.valueOf(seconds)
                .divide(BigDecimal.valueOf(3600), 6, RoundingMode.HALF_UP);
        if (hours.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        return energyKwh.multiply(BigDecimal.valueOf(1000))
                .divide(hours, 2, RoundingMode.HALF_UP);
    }

    public Map<String, Object> estimateCostForDeviceOverHours(Long deviceId,
                                                              double hours,
                                                              ZoneId zoneId) {
        if (hours <= 0) {
            throw new IllegalArgumentException("Hours must be > 0");
        }

        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));

        Double ratedPowerW = device.getRatedPowerW();
        if (ratedPowerW == null) {
            // próbujemy oszacować z historii – np. średnia z ostatnich 7 dni
            Instant since = Instant.now().minus(7, ChronoUnit.DAYS);
            Double avgPower = energyMeasurementRepository
                    .findAveragePowerWForDeviceSince(device.getId(), since);

            if (avgPower == null) {
                throw new IllegalStateException("No ratedPowerW and no history to approximate for device " + deviceId);
            }

            ratedPowerW = avgPower;
        }


        BigDecimal powerW = BigDecimal.valueOf(ratedPowerW);
        BigDecimal powerKw = powerW
                .divide(BigDecimal.valueOf(1000), 6, RoundingMode.HALF_UP);

        BigDecimal hoursBd = BigDecimal.valueOf(hours);

        BigDecimal energyKwh = powerKw.multiply(hoursBd);
        BigDecimal rate = getRatePerKwh(); // np. 1.07

        BigDecimal cost = energyKwh.multiply(rate)
                .setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> resp = new HashMap<>();
        resp.put("deviceId", deviceId);
        resp.put("hours", hours);
        resp.put("ratedPowerW", ratedPowerW);
        resp.put("energyKwh", energyKwh);
        resp.put("ratePerKwh", rate);
        resp.put("cost", cost);
        resp.put("mode", "RATED_POWER");

        return resp;
    }

    public BigDecimal calculateLightingEnergyKwhForDevice(Long deviceId, YearMonth month, ZoneId zoneId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));

        if (device.getRatedPowerW() == null) {
            return BigDecimal.ZERO;
        }

        Instant from = month.atDay(1).atStartOfDay(zoneId).toInstant();
        Instant to = month.plusMonths(1).atDay(1).atStartOfDay(zoneId).toInstant();

        List<LightingUsage> usages = lightingUsageRepository
                .findByDeviceAndStartTimeBetween(device, from, to);

        double totalSeconds = 0.0;
        for (LightingUsage u : usages) {
            if (u.getDurationSeconds() != null) {
                totalSeconds += u.getDurationSeconds();
            }
        }

        double hours = totalSeconds / 3600.0;
        double powerKw = device.getRatedPowerW() / 1000.0;
        double kwh = powerKw * hours;

        return BigDecimal.valueOf(kwh);
    }

    public BigDecimal calculateLightingCostForDevice(Long deviceId, YearMonth month, ZoneId zoneId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));

        BigDecimal energyKwh = calculateLightingEnergyKwhForDevice(deviceId, month, zoneId);
        BigDecimal rate = getRatePerKwh();

        BigDecimal cost = energyKwh.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        System.out.printf(
                "[LIGHT-COST] deviceId=%d, month=%s, kWh=%s, rate=%s, cost=%s%n",
                deviceId, month, energyKwh.toPlainString(), rate.toPlainString(), cost.toPlainString()
        );

        return cost;
    }

    public BigDecimal calculateMonthlyEnergyKwhForDevice(Long deviceId, YearMonth month, ZoneId zoneId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));

        Instant from = month.atDay(1).atStartOfDay(zoneId).toInstant();
        Instant to = month.plusMonths(1).atDay(1).atStartOfDay(zoneId).toInstant();

        System.out.printf(
                "[COST] deviceId=%d, month=%s, from=%s, to=%s%n",
                deviceId, month, from, to
        );

        List<EnergyMeasurement> list = energyMeasurementRepository
                .findByDeviceAndMeasuredAtBetweenOrderByMeasuredAt(device, from, to);

        System.out.printf(
                "[COST] measurements found: %d%n",
                list.size()
        );

        if (list.isEmpty()) {
            return BigDecimal.ZERO;
        }

        list.stream()
                .limit(5)
                .forEach(m -> System.out.printf(
                        "[COST] sample row: measuredAt=%s, energyKwh=%s%n",
                        m.getMeasuredAt(), m.getEnergyKwh()
                ));

        Double last = null;
        double totalKwh = 0.0;

        for (EnergyMeasurement m : list) {
            Double e = m.getEnergyKwh();
            if (e == null) {
                continue;
            }

            if (last != null) {
                double diff = e - last;

                if (diff > 0.0 && diff < 1000.0) {
                    totalKwh += diff;
                }
            }
            last = e;
        }

        System.out.printf(
                "[COST] deviceId=%d, month=%s, totalKwh=%.6f%n",
                deviceId, month, totalKwh
        );

        return BigDecimal.valueOf(totalKwh);
    }

    public BigDecimal calculateMonthlyCostForDevice(Long deviceId, YearMonth month, ZoneId zoneId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));

        BigDecimal energyKwh = calculateMonthlyEnergyKwhForDevice(deviceId, month, zoneId);
        BigDecimal rate = getRatePerKwh();

        BigDecimal cost = energyKwh.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        System.out.printf(
                "[COST] deviceId=%d, category=%s, kWh=%s, rate=%s, cost=%s%n",
                deviceId, device.getCategory(), energyKwh.toPlainString(), rate.toPlainString(), cost.toPlainString()
        );

        return cost;
    }

    public BigDecimal calculateMonthlyCostForCategory(String category, YearMonth month, ZoneId zoneId) {
        List<Device> devices = deviceRepository.findAll().stream()
                .filter(d -> category.equals(d.getCategory()))
                .collect(Collectors.toList());

        BigDecimal total = BigDecimal.ZERO;
        BigDecimal rate = getRatePerKwh();

        for (Device device : devices) {
            BigDecimal energyKwh = calculateMonthlyEnergyKwhForDevice(device.getId(), month, zoneId);
            BigDecimal cost = energyKwh.multiply(rate);
            total = total.add(cost);
        }

        return total.setScale(2, RoundingMode.HALF_UP);
    }

    public Map<String, BigDecimal> calculateMonthlyCostPerCategory(YearMonth month, ZoneId zoneId) {
        List<Device> devices = deviceRepository.findAll();

        Map<String, List<Device>> byCategory = devices.stream()
                .filter(d -> d.getCategory() != null)
                .collect(Collectors.groupingBy(Device::getCategory));

        Map<String, BigDecimal> result = new HashMap<>();

        for (Map.Entry<String, List<Device>> entry : byCategory.entrySet()) {
            String category = entry.getKey();
            List<Device> devs = entry.getValue();

            BigDecimal rate = getRatePerKwh();
            BigDecimal totalCost = BigDecimal.ZERO;

            System.out.printf(
                    "[COST] cat=%s, devices=%d, rate=%s%n",
                    category, devs.size(), rate.toPlainString()
            );

            for (Device d : devs) {
                BigDecimal energyKwh = calculateMonthlyEnergyKwhForDevice(d.getId(), month, zoneId);
                BigDecimal cost = energyKwh.multiply(rate);
                totalCost = totalCost.add(cost);
            }

            BigDecimal catCost = totalCost.setScale(2, RoundingMode.HALF_UP);
            result.put(category, catCost);

            System.out.printf(
                    "[COST] cat=%s, month=%s, catCost=%s%n",
                    category, month, catCost.toPlainString()
            );
        }

        return result;
    }

    public Map<String, Object> estimateAdditionalDeviceEnergyAndCost(
            Long additionalDeviceId,
            Double hours,
            Integer days,
            Double avgHoursPerDay
    ) {
        if (hours == null && (days == null || avgHoursPerDay == null)) {
            throw new IllegalArgumentException("Provide either 'hours' OR ('days' and 'avgHoursPerDay').");
        }

        AdditionalDevice device = additionalDeviceRepository.findById(additionalDeviceId)
                .orElseThrow(() -> new IllegalArgumentException("Additional device not found: " + additionalDeviceId));

        if (device.getRatedPowerW() == null) {
            // nie znamy mocy -> nie umiemy policzyć
            Map<String, Object> resp = new HashMap<>();
            resp.put("deviceId", additionalDeviceId);
            resp.put("error", "ratedPowerW is not set for this device");
            return resp;
        }

        double totalHours;
        String mode;

        if (hours != null) {
            totalHours = hours;
            mode = "HOURS";
        } else {
            totalHours = days * avgHoursPerDay;
            mode = "DAYS_AVG_PER_DAY";
        }

        // moc w kW
        double powerKw = device.getRatedPowerW() / 1000.0;
        BigDecimal energyKwh = BigDecimal.valueOf(powerKw * totalHours);

        // stawka po kategorii (jak dla reszty)
        BigDecimal rate = getRatePerKwh();
        BigDecimal cost = energyKwh.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> resp = new HashMap<>();
        resp.put("deviceId", additionalDeviceId);
        resp.put("mode", mode);
        resp.put("hours", totalHours);
        resp.put("ratedPowerW", device.getRatedPowerW());
        resp.put("energyKwh", energyKwh);
        resp.put("ratePerKwh", rate);
        resp.put("cost", cost);

        return resp;
    }
}

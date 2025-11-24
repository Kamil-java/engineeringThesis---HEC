package pl.bak.home_energy_controller.billing;

import pl.bak.home_energy_controller.domain.dao.AdditionalDeviceRepository;
import pl.bak.home_energy_controller.domain.dao.DeviceRepository;
import pl.bak.home_energy_controller.domain.dao.EnergyMeasurementRepository;
import pl.bak.home_energy_controller.domain.dao.LightingUsageRepository;
import pl.bak.home_energy_controller.domain.model.AdditionalDevice;
import pl.bak.home_energy_controller.domain.model.Device;
import pl.bak.home_energy_controller.domain.model.EnergyMeasurement;
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

    private static final BigDecimal ONE_THOUSAND = BigDecimal.valueOf(1000);
    private static final BigDecimal SECONDS_PER_HOUR = BigDecimal.valueOf(3600);

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

    private Device getDeviceOrThrow(Long deviceId) {
        return deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));
    }

    private BigDecimal getRatePerKwh() {
        return tariffSettingsService.getCurrentSettings().getGrossRatePerKwh();
    }

    public BigDecimal calculateEnergyKwhForDeviceBetween(Long deviceId,
                                                         Instant from,
                                                         Instant to) {
        Device device = getDeviceOrThrow(deviceId);

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
            Double val = em.getEnergyKwh();
            if (val == null) {
                continue;
            }

            if (prevVal != null) {
                double diff = val - prevVal;

                if (diff >= 0.0) {
                    total = total.add(BigDecimal.valueOf(diff));
                }
            }

            prevVal = val;
        }

        return total.setScale(3, RoundingMode.HALF_UP);
    }

    public BigDecimal calculateCostForDeviceBetween(Long deviceId,
                                                    Instant from,
                                                    Instant to) {
        BigDecimal energyKwh = calculateEnergyKwhForDeviceBetween(deviceId, from, to);
        BigDecimal rate = getRatePerKwh();
        return energyKwh.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal calculateAveragePowerWForPeriod(BigDecimal energyKwh,
                                                      Instant from,
                                                      Instant to) {
        long seconds = Duration.between(from, to).getSeconds();
        if (seconds <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal hours = BigDecimal.valueOf(seconds)
                .divide(SECONDS_PER_HOUR, 6, RoundingMode.HALF_UP);

        if (hours.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return energyKwh.multiply(ONE_THOUSAND)
                .divide(hours, 2, RoundingMode.HALF_UP);
    }

    public Map<String, Object> estimateCostForDeviceOverHours(Long deviceId, double hours) {
        if (hours <= 0) {
            throw new IllegalArgumentException("Hours must be > 0");
        }

        Device device = getDeviceOrThrow(deviceId);

        Double ratedPowerW = device.getRatedPowerW();
        if (ratedPowerW == null) {
            Instant since = Instant.now().minus(7, ChronoUnit.DAYS);
            Double avgPower = energyMeasurementRepository
                    .findAveragePowerWForDeviceSince(device.getId(), since);

            if (avgPower == null) {
                throw new IllegalStateException("No ratedPowerW and no history to approximate for device " + deviceId);
            }

            ratedPowerW = avgPower;
        }

        BigDecimal powerW = BigDecimal.valueOf(ratedPowerW);
        BigDecimal powerKw = powerW.divide(ONE_THOUSAND, 6, RoundingMode.HALF_UP);
        BigDecimal hoursBd = BigDecimal.valueOf(hours);

        BigDecimal energyKwh = powerKw.multiply(hoursBd);
        BigDecimal rate = getRatePerKwh();
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

    public BigDecimal calculateLightingEnergyKwhForDevice(Long deviceId,
                                                          YearMonth month,
                                                          ZoneId zoneId) {
        Device device = getDeviceOrThrow(deviceId);

        if (device.getRatedPowerW() == null) {
            return BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        }

        Instant from = month.atDay(1).atStartOfDay(zoneId).toInstant();
        Instant to = month.plusMonths(1).atDay(1).atStartOfDay(zoneId).toInstant();

        List<LightingUsage> usages = lightingUsageRepository
                .findByDeviceAndStartTimeBetween(device, from, to);

        double totalSeconds = usages.stream()
                .map(LightingUsage::getDurationSeconds)
                .filter(Objects::nonNull)
                .mapToDouble(Long::doubleValue)
                .sum();

        double hours = totalSeconds / 3600.0;
        double powerKw = device.getRatedPowerW() / 1000.0;
        double kwh = powerKw * hours;

        return BigDecimal.valueOf(kwh).setScale(3, RoundingMode.HALF_UP);
    }

    public BigDecimal calculateLightingCostForDevice(Long deviceId,
                                                     YearMonth month,
                                                     ZoneId zoneId) {
        BigDecimal energyKwh = calculateLightingEnergyKwhForDevice(deviceId, month, zoneId);
        BigDecimal rate = getRatePerKwh();

        return energyKwh.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateMonthlyEnergyKwhForDevice(Device device,
                                                          YearMonth month,
                                                          ZoneId zoneId) {
        Instant from = month.atDay(1).atStartOfDay(zoneId).toInstant();
        Instant to = month.plusMonths(1).atDay(1).atStartOfDay(zoneId).toInstant();

        List<EnergyMeasurement> list = energyMeasurementRepository
                .findByDeviceAndMeasuredAtBetweenOrderByMeasuredAt(device, from, to);

        if (list.isEmpty()) {
            return BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        }

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

        return BigDecimal.valueOf(totalKwh).setScale(3, RoundingMode.HALF_UP);
    }

    public BigDecimal calculateMonthlyCostForDevice(Long deviceId,
                                                    YearMonth month,
                                                    ZoneId zoneId) {
        Device device = getDeviceOrThrow(deviceId);

        BigDecimal energyKwh = calculateMonthlyEnergyKwhForDevice(device, month, zoneId);
        BigDecimal rate = getRatePerKwh();

        BigDecimal cost = energyKwh.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        return cost;
    }

    public Map<String, BigDecimal> calculateMonthlyCostPerCategory(YearMonth month,
                                                                   ZoneId zoneId) {
        List<Device> devices = deviceRepository.findAll();

        Map<String, List<Device>> byCategory = devices.stream()
                .filter(d -> d.getCategory() != null)
                .collect(Collectors.groupingBy(Device::getCategory));

        Map<String, BigDecimal> result = new HashMap<>();
        BigDecimal rate = getRatePerKwh();

        for (Map.Entry<String, List<Device>> entry : byCategory.entrySet()) {
            String category = entry.getKey();
            List<Device> devs = entry.getValue();

            BigDecimal totalCost = BigDecimal.ZERO;

            for (Device d : devs) {
                BigDecimal energyKwh = calculateMonthlyEnergyKwhForDevice(d, month, zoneId);
                BigDecimal cost = energyKwh.multiply(rate);
                totalCost = totalCost.add(cost);
            }

            BigDecimal catCost = totalCost.setScale(2, RoundingMode.HALF_UP);
            result.put(category, catCost);
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

        double powerKw = device.getRatedPowerW() / 1000.0;
        BigDecimal energyKwh = BigDecimal.valueOf(powerKw * totalHours).setScale(3, RoundingMode.HALF_UP);

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

    public Map<String, Object> buildPeriodDeviceCostResponse(Long deviceId, Instant from, Instant to) {
        BigDecimal energyKwh = calculateEnergyKwhForDeviceBetween(deviceId, from, to);
        BigDecimal cost = calculateCostForDeviceBetween(deviceId, from, to);
        BigDecimal avgPowerW = calculateAveragePowerWForPeriod(energyKwh, from, to);

        Map<String, Object> resp = new HashMap<>();
        resp.put("deviceId", deviceId);
        resp.put("from", from);
        resp.put("to", to);
        resp.put("energyKwh", energyKwh);
        resp.put("cost", cost);
        resp.put("avgPowerW", avgPowerW);

        return resp;
    }
}

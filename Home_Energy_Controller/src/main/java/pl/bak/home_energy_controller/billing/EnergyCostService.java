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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class EnergyCostService {

    private final EnergyMeasurementRepository energyMeasurementRepository;
    private final DeviceRepository deviceRepository;
    private final TariffProperties tariffProperties;
    private final LightingUsageRepository lightingUsageRepository;
    private final AdditionalDeviceRepository additionalDeviceRepository;


    public EnergyCostService(EnergyMeasurementRepository energyMeasurementRepository,
                             DeviceRepository deviceRepository,
                             LightingUsageRepository lightingUsageRepository,
                             AdditionalDeviceRepository additionalDeviceRepository,
                             TariffProperties tariffProperties) {
        this.energyMeasurementRepository = energyMeasurementRepository;
        this.deviceRepository = deviceRepository;
        this.lightingUsageRepository = lightingUsageRepository;
        this.additionalDeviceRepository = additionalDeviceRepository;
        this.tariffProperties = tariffProperties;
    }

    public Map<String, Object> estimateCostForDeviceOverHours(Long deviceId, double hours, ZoneId zoneId) {
        if (hours <= 0) {
            throw new IllegalArgumentException("Hours must be > 0");
        }

        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));

        Optional<EnergyMeasurement> opt = energyMeasurementRepository
                .findTopByDeviceOrderByMeasuredAtDesc(device);

        if (opt.isEmpty() || opt.get().getPowerW() == null) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("deviceId", deviceId);
            resp.put("hours", hours);
            resp.put("estimatedEnergyKwh", BigDecimal.ZERO);
            resp.put("estimatedCost", BigDecimal.ZERO);
            resp.put("assumedPowerW", null);
            return resp;
        }

        EnergyMeasurement last = opt.get();
        Double powerW = last.getPowerW();
        BigDecimal rate = tariffProperties.getRateForCategory(device.getCategory());

        BigDecimal powerKw = BigDecimal.valueOf(powerW / 1000.0);

        BigDecimal energyKwh = powerKw.multiply(BigDecimal.valueOf(hours));

        BigDecimal cost = energyKwh.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> resp = new HashMap<>();
        resp.put("deviceId", deviceId);
        resp.put("hours", hours);
        resp.put("assumedPowerW", powerW);
        resp.put("estimatedEnergyKwh", energyKwh);
        resp.put("estimatedCost", cost);
        resp.put("lastMeasurementAt", last.getMeasuredAt());

        System.out.printf(
                "[COST-EST] deviceId=%d, hours=%.2f, powerW=%.2f, kWh=%s, rate=%s, cost=%s%n",
                deviceId, hours, powerW,
                energyKwh.toPlainString(),
                rate.toPlainString(),
                cost.toPlainString()
        );

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
        BigDecimal rate = tariffProperties.getRateForCategory(device.getCategory());

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
        BigDecimal rate = tariffProperties.getRateForCategory(device.getCategory());

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
        BigDecimal rate = tariffProperties.getRateForCategory(category);

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

            BigDecimal rate = tariffProperties.getRateForCategory(category);
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
        BigDecimal rate = tariffProperties.getRateForCategory(device.getCategory());
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

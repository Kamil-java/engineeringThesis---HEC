package pl.bak.home_energy_controller.rest;

import org.springframework.web.bind.annotation.*;
import pl.bak.home_energy_controller.billing.EnergyCostService;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/costs")
public class EnergyCostController {

    private final EnergyCostService energyCostService;
    private final ZoneId zoneId = ZoneId.of("Europe/Warsaw");

    public EnergyCostController(EnergyCostService energyCostService) {
        this.energyCostService = energyCostService;
    }

    @GetMapping("/device/{deviceId}/estimate")
    public Map<String, Object> estimateDeviceCost(
            @PathVariable Long deviceId,
            @RequestParam(name = "hours", defaultValue = "5") double hours
    ) {
        return energyCostService.estimateCostForDeviceOverHours(
                deviceId,
                hours,
                ZoneId.of("Europe/Warsaw")
        );
    }

    @GetMapping("/device/{deviceId}/current-month")
    public Map<String, Object> getCurrentMonthDeviceCost(@PathVariable Long deviceId) {
        YearMonth ym = YearMonth.now(zoneId);

        BigDecimal energyKwh = energyCostService
                .calculateMonthlyEnergyKwhForDevice(deviceId, ym, zoneId);
        BigDecimal cost = energyCostService
                .calculateMonthlyCostForDevice(deviceId, ym, zoneId);

        Map<String, Object> response = new HashMap<>();
        response.put("deviceId", deviceId);
        response.put("year", ym.getYear());
        response.put("month", ym.getMonthValue());
        response.put("energyKwh", energyKwh);
        response.put("cost", cost);

        return response;
    }

    @GetMapping("/additional-device/{deviceId}/estimate")
    public Map<String, Object> estimateAdditionalDevice(
            @PathVariable Long deviceId,
            @RequestParam(name = "hours", required = false) Double hours,
            @RequestParam(name = "days", required = false) Integer days,
            @RequestParam(name = "avgHoursPerDay", required = false) Double avgHoursPerDay
    ) {
        if (hours == null && (days == null || avgHoursPerDay == null)) {
            throw new IllegalArgumentException(
                    "You must provide either 'hours' OR 'days' and 'avgHoursPerDay'."
            );
        }

        return energyCostService.estimateAdditionalDeviceEnergyAndCost(
                deviceId,
                hours,
                days,
                avgHoursPerDay
        );
    }

    @GetMapping("/current-month/summary")
    public Map<String, Object> getCurrentMonthSummary() {
        YearMonth ym = YearMonth.now(zoneId);

        Map<String, BigDecimal> perCategory =
                energyCostService.calculateMonthlyCostPerCategory(ym, zoneId);

        BigDecimal total = perCategory.values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> response = new HashMap<>();
        response.put("year", ym.getYear());
        response.put("month", ym.getMonthValue());
        response.put("totalCost", total);
        response.put("perCategory", perCategory);

        return response;
    }

    @GetMapping("/lighting/device/{deviceId}/current-month")
    public Map<String, Object> getCurrentMonthLightingCost(@PathVariable Long deviceId) {
        YearMonth ym = YearMonth.now(ZoneId.of("Europe/Warsaw"));
        ZoneId zone = ZoneId.of("Europe/Warsaw");

        BigDecimal energyKwh = energyCostService
                .calculateLightingEnergyKwhForDevice(deviceId, ym, zone);

        BigDecimal cost = energyCostService
                .calculateLightingCostForDevice(deviceId, ym, zone);

        Map<String, Object> resp = new HashMap<>();
        resp.put("deviceId", deviceId);
        resp.put("year", ym.getYear());
        resp.put("month", ym.getMonthValue());
        resp.put("energyKwh", energyKwh);
        resp.put("cost", cost);

        return resp;
    }
}


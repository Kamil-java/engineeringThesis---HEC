package pl.bak.home_energy_controller.advisor;

import org.springframework.stereotype.Service;
import pl.bak.home_energy_controller.billing.EnergyCostService;
import pl.bak.home_energy_controller.domain.dao.DeviceRepository;
import pl.bak.home_energy_controller.domain.model.Device;
import pl.bak.home_energy_controller.mappers.dto.AdviceDto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class EnergyAdvisorService {

    private static final String TYPE_GLOBAL = "GLOBAL";
    private static final String TYPE_DEVICE = "DEVICE";

    private static final String CATEGORY_LIGHTING = "dj";
    private static final String CATEGORY_SOCKETS = "cz";

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private static final BigDecimal LIGHTING_SHARE_THRESHOLD = new BigDecimal("0.30");
    private static final BigDecimal SOCKETS_SHARE_THRESHOLD = new BigDecimal("0.50");

    private static final BigDecimal HIGH_DEVICE_COST = new BigDecimal("30");
    private static final BigDecimal MEDIUM_DEVICE_COST = new BigDecimal("15");
    private static final BigDecimal MIN_QUICK_WIN_SAVING = new BigDecimal("1.0");

    private static final double QUICK_WIN_HOURS = 30.0;

    private final DeviceRepository deviceRepository;
    private final EnergyCostService energyCostService;

    private final ZoneId zoneId = ZoneId.of("Europe/Warsaw");

    public EnergyAdvisorService(DeviceRepository deviceRepository,
                                EnergyCostService energyCostService) {
        this.deviceRepository = deviceRepository;
        this.energyCostService = energyCostService;
    }

    public List<AdviceDto> generateMonthlyAdvice() {
        List<AdviceDto> advices = new ArrayList<>();
        YearMonth ym = YearMonth.now(zoneId);

        Map<String, BigDecimal> basePerCategory = energyCostService.calculateMonthlyCostPerCategory(ym, zoneId);
        Map<String, BigDecimal> perCategory = new HashMap<>(basePerCategory);

        List<Device> allDevices = deviceRepository.findAll();
        BigDecimal lightingExtra = calculateLightingExtra(ym, allDevices);

        if (lightingExtra.compareTo(ZERO) > 0) {
            perCategory.merge(CATEGORY_LIGHTING, lightingExtra, BigDecimal::add);
        }

        BigDecimal totalCost = perCategory.values().stream()
                .reduce(ZERO, BigDecimal::add);

        addGlobalSummaryAdvice(advices, ym, totalCost);
        addLightingAdvice(advices, perCategory, totalCost);
        addSocketsAdvice(advices, perCategory, totalCost);

        if (allDevices.isEmpty()) {
            return advices;
        }

        List<DeviceCost> deviceCosts = calculateDeviceCosts(ym, allDevices);
        if (deviceCosts.isEmpty()) {
            return advices;
        }

        deviceCosts.sort(Comparator.comparing(DeviceCost::getCost).reversed());

        addDeviceAdvices(advices, deviceCosts);

        return advices;
    }

    private BigDecimal calculateLightingExtra(YearMonth ym, List<Device> allDevices) {
        return allDevices.stream()
                .filter(d -> CATEGORY_LIGHTING.equalsIgnoreCase(d.getCategory()))
                .map(d -> {
                    try {
                        return energyCostService.calculateLightingCostForDevice(d.getId(), ym, zoneId);
                    } catch (Exception ex) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .reduce(ZERO, BigDecimal::add);
    }

    private void addGlobalSummaryAdvice(List<AdviceDto> advices, YearMonth ym, BigDecimal totalCost) {
        AdviceDto summary = new AdviceDto();
        summary.setType(TYPE_GLOBAL);
        summary.setSeverity("INFO");

        if (totalCost.compareTo(ZERO) > 0) {
            summary.setTitle("Podsumowanie bieżącego miesiąca");
            summary.setMessage(
                    String.format(
                            "Łączny koszt energii (urządzenia Tuya) w %d-%02d wynosi około %.2f zł.",
                            ym.getYear(),
                            ym.getMonthValue(),
                            totalCost.setScale(2, RoundingMode.HALF_UP).doubleValue()
                    )
            );
        } else {
            summary.setTitle("Brak istotnego zużycia");
            summary.setMessage(
                    "W bieżącym miesiącu nie ma jeszcze istotnych danych o kosztach energii. " +
                            "Gdy urządzenia popracują dłużej, asystent będzie mógł zaproponować konkretniejsze działania."
            );
        }

        advices.add(summary);
    }

    private void addLightingAdvice(List<AdviceDto> advices,
                                   Map<String, BigDecimal> perCategory,
                                   BigDecimal totalCost) {
        BigDecimal lightingCost = perCategory.getOrDefault(CATEGORY_LIGHTING, ZERO);
        if (totalCost.compareTo(ZERO) <= 0 || lightingCost.compareTo(ZERO) <= 0) {
            return;
        }

        BigDecimal share = safeShare(lightingCost, totalCost);
        AdviceDto advice = new AdviceDto();
        advice.setType(TYPE_GLOBAL);

        if (share.compareTo(LIGHTING_SHARE_THRESHOLD) >= 0) {
            advice.setSeverity("WARNING");
            advice.setTitle("Duży udział oświetlenia w rachunku");
            advice.setMessage(String.format(
                    "Oświetlenie (kategoria 'dj') stanowi około %.0f%% miesięcznego rachunku. " +
                            "Rozważ skrócenie czasu świecenia (np. automatyczne wyłączanie w nocy), " +
                            "użycie czujników ruchu albo wymianę żarówek na bardziej energooszczędne.",
                    share.multiply(ONE_HUNDRED).doubleValue()
            ));
        } else {
            advice.setSeverity("INFO");
            advice.setTitle("Oświetlenie w normie");
            advice.setMessage(String.format(
                    "Oświetlenie (kategoria 'dj') odpowiada za około %.0f%% rachunku. " +
                            "Nie wygląda na to, żeby lampy były głównym winowajcą wysokich kosztów.",
                    share.multiply(ONE_HUNDRED).doubleValue()
            ));
        }

        advices.add(advice);
    }

    private void addSocketsAdvice(List<AdviceDto> advices,
                                  Map<String, BigDecimal> perCategory,
                                  BigDecimal totalCost) {
        BigDecimal socketsCost = perCategory.getOrDefault(CATEGORY_SOCKETS, ZERO);
        if (totalCost.compareTo(ZERO) <= 0 || socketsCost.compareTo(ZERO) <= 0) {
            return;
        }

        BigDecimal share = safeShare(socketsCost, totalCost);
        if (share.compareTo(SOCKETS_SHARE_THRESHOLD) < 0) {
            return;
        }

        AdviceDto advice = new AdviceDto();
        advice.setType(TYPE_GLOBAL);
        advice.setSeverity("INFO");
        advice.setTitle("Większość kosztów generują gniazdka");
        advice.setMessage(String.format(
                "Urządzenia podłączone do gniazdek (kategoria 'cz') odpowiadają " +
                        "za około %.0f%% miesięcznego rachunku. " +
                        "Sprawdź, czy któreś z nich nie pracuje niepotrzebnie w trybie czuwania.",
                share.multiply(ONE_HUNDRED).doubleValue()
        ));

        advices.add(advice);
    }

    private List<DeviceCost> calculateDeviceCosts(YearMonth ym, List<Device> allDevices) {
        return allDevices.stream()
                .map(d -> {
                    try {
                        BigDecimal cost;
                        if (CATEGORY_LIGHTING.equalsIgnoreCase(d.getCategory())) {
                            cost = energyCostService.calculateLightingCostForDevice(d.getId(), ym, zoneId);
                        } else {
                            cost = energyCostService.calculateMonthlyCostForDevice(d.getId(), ym, zoneId);
                        }
                        if (cost == null) {
                            return null;
                        }
                        return new DeviceCost(d, cost);
                    } catch (Exception ex) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private void addDeviceAdvices(List<AdviceDto> advices,
                                  List<DeviceCost> deviceCosts) {
        for (DeviceCost dc : deviceCosts) {
            Device d = dc.getDevice();
            BigDecimal c = dc.getCost();

            if (c.compareTo(MEDIUM_DEVICE_COST) < 0) {
                continue;
            }

            String name = d.getName() != null ? d.getName() : "Urządzenie ID " + d.getId();

            AdviceDto advice = new AdviceDto();
            advice.setType(TYPE_DEVICE);
            advice.setDeviceId(d.getId());
            advice.setDeviceName(name);
            advice.setCategory(d.getCategory());

            if (c.compareTo(HIGH_DEVICE_COST) >= 0) {
                advice.setSeverity("CRITICAL");
                advice.setTitle("Bardzo wysoki koszt urządzenia");
                advice.setMessage(String.format(
                        "%s generuje w tym miesiącu koszt około %.2f zł. " +
                                "To sporo powyżej standardu. Rozważ ograniczenie czasu pracy, " +
                                "automatyczne wyłączanie w godzinach, gdy nie jest potrzebne " +
                                "lub wymianę na bardziej energooszczędny model.",
                        name,
                        c.setScale(2, RoundingMode.HALF_UP).doubleValue()
                ));
            } else {
                advice.setSeverity("WARNING");
                advice.setTitle("Podwyższony koszt urządzenia");
                advice.setMessage(String.format(
                        "%s generuje zauważalny koszt około %.2f zł w bieżącym miesiącu. " +
                                "Warto sprawdzić, czy faktycznie musi pracować tyle godzin dziennie.",
                        name,
                        c.setScale(2, RoundingMode.HALF_UP).doubleValue()
                ));
            }

            if (d.getRatedPowerW() == null) {
                advice.setMessage(
                        advice.getMessage() +
                                " Dodatkowo nie ustawiono mocy znamionowej w aplikacji – " +
                                "uzupełnienie tej informacji pozwoli na dokładniejsze estymacje i porady."
                );
            }

            advices.add(advice);

            AdviceDto quickWin = buildQuickWinAdvice(d);
            if (quickWin != null) {
                advices.add(quickWin);
            }
        }
    }

    private AdviceDto buildQuickWinAdvice(Device d) {
        try {
            Map<String, Object> estimate = energyCostService.estimateCostForDeviceOverHours(d.getId(), QUICK_WIN_HOURS);

            Object costObj = estimate.get("cost");
            if (costObj == null) {
                return null;
            }

            BigDecimal cost = costObj instanceof BigDecimal
                    ? (BigDecimal) costObj
                    : new BigDecimal(costObj.toString());

            if (cost.compareTo(MIN_QUICK_WIN_SAVING) < 0) {
                return null;
            }

            String name = d.getName() != null ? d.getName() : "Urządzenie ID " + d.getId();

            AdviceDto advice = new AdviceDto();
            advice.setType(TYPE_DEVICE);
            advice.setSeverity("INFO");
            advice.setDeviceId(d.getId());
            advice.setDeviceName(name);
            advice.setCategory(d.getCategory());
            advice.setTitle("Szybka oszczędność – ogranicz czas pracy");
            advice.setMessage(String.format(
                    "Jeśli skrócisz czas pracy urządzenia %s o około 1 godzinę dziennie " +
                            "(~30 godzin miesięcznie), zaoszczędzisz mniej więcej %.2f zł miesięcznie, " +
                            "nie zmieniając radykalnie swojego komfortu.",
                    name,
                    cost.setScale(2, RoundingMode.HALF_UP).doubleValue()
            ));

            return advice;
        } catch (Exception ex) {
            return null;
        }
    }

    private BigDecimal safeShare(BigDecimal part, BigDecimal total) {
        if (total == null || total.compareTo(ZERO) == 0) {
            return ZERO;
        }
        return part.divide(total, 2, RoundingMode.HALF_UP);
    }

    private static class DeviceCost {
        private final Device device;
        private final BigDecimal cost;

        private DeviceCost(Device device, BigDecimal cost) {
            this.device = device;
            this.cost = cost;
        }

        public Device getDevice() {
            return device;
        }

        public BigDecimal getCost() {
            return cost;
        }
    }
}

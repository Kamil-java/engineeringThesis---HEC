package pl.bak.home_energy_controller.tariff;

import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.FileReader;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

@Service
public class EnergyRateService {

    private final List<EnergyRate> rates = new ArrayList<>();

    public void loadRatesFromCsv(String filePath) {
        try (BufferedReader reader = new BufferedReader(new FileReader(Paths.get(filePath).toFile()))) {
            reader.readLine(); // skip header
            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split(",");
                EnergyRate rate = new EnergyRate(
                        parts[0].trim(), // Provider
                        parts[1].trim(), // Tariff
                        Double.parseDouble(parts[2]), // Day price
                        Double.parseDouble(parts[3]), // Night price
                        Double.parseDouble(parts[4]), // Fixed charge
                        parts[5].trim(), // Valid from
                        parts[6].trim()  // Valid to
                );
                rates.add(rate);
            }
            System.out.println("✅ Loaded " + rates.size() + " energy rates from CSV");
        } catch (Exception e) {
            System.err.println("❌ Failed to load CSV file: " + e.getMessage());
        }
    }

    public List<EnergyRate> getRates() {
        return rates;
    }

    public EnergyRate getRateByTariff(String tariff) {
        return rates.stream()
                .filter(r -> r.getTariff().equalsIgnoreCase(tariff))
                .findFirst()
                .orElse(null);
    }
}


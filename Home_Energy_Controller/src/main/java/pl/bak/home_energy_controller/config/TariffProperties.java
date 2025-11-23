package pl.bak.home_energy_controller.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Configuration
@ConfigurationProperties(prefix = "hec.tariffs")
public class TariffProperties {

    private BigDecimal defaultRatePerKwh = BigDecimal.ZERO;

    private Map<String, BigDecimal> categories = new HashMap<>();

    public TariffProperties() {
    }

    public BigDecimal getDefaultRatePerKwh() {
        return defaultRatePerKwh;
    }

    public void setDefaultRatePerKwh(BigDecimal defaultRatePerKwh) {
        this.defaultRatePerKwh = defaultRatePerKwh;
    }

    public Map<String, BigDecimal> getCategories() {
        return categories;
    }

    public void setCategories(Map<String, BigDecimal> categories) {
        this.categories = categories;
    }

    public BigDecimal getRateForCategory(String category) {
        if (category != null && categories.containsKey(category)) {
            return categories.get(category);
        }
        return defaultRatePerKwh != null ? defaultRatePerKwh : BigDecimal.ZERO;
    }
}

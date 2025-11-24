package pl.bak.home_energy_controller.domain.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.bak.home_energy_controller.domain.dao.TariffSettingsRepository;
import pl.bak.home_energy_controller.domain.model.TariffSettings;
import pl.bak.home_energy_controller.mappers.dto.TariffSettingsDto;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class TariffSettingsService {

    private static final long SETTINGS_ID = 1L;
    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    private final TariffSettingsRepository repository;

    public TariffSettingsService(TariffSettingsRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public TariffSettingsDto getCurrentSettings() {
        TariffSettings entity = loadOrCreateSettings();
        return toDto(entity);
    }

    @Transactional
    public TariffSettingsDto updateSettings(TariffSettingsDto dto) {
        TariffSettings entity = loadOrCreateSettings();

        applyDtoToEntity(dto, entity);
        fillMissingNetRate(entity);

        TariffSettings saved = repository.save(entity);
        return toDto(saved);
    }

    private TariffSettings loadOrCreateSettings() {
        return repository.findById(SETTINGS_ID)
                .orElseGet(() -> {
                    TariffSettings t = new TariffSettings();
                    t.setId(SETTINGS_ID);
                    return t;
                });
    }

    private TariffSettingsDto toDto(TariffSettings entity) {
        TariffSettingsDto dto = new TariffSettingsDto();
        dto.setNetRatePerKwh(entity.getNetRatePerKwh());
        dto.setGrossRatePerKwh(entity.getGrossRatePerKwh());
        dto.setVatPercent(entity.getVatPercent());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    private void applyDtoToEntity(TariffSettingsDto dto, TariffSettings entity) {
        if (dto.getNetRatePerKwh() != null) {
            entity.setNetRatePerKwh(dto.getNetRatePerKwh());
        }
        if (dto.getGrossRatePerKwh() != null) {
            entity.setGrossRatePerKwh(dto.getGrossRatePerKwh());
        }
        if (dto.getVatPercent() != null) {
            entity.setVatPercent(dto.getVatPercent());
        }
    }

    private void fillMissingNetRate(TariffSettings entity) {
        if (entity.getGrossRatePerKwh() != null &&
                entity.getVatPercent() != null &&
                entity.getNetRatePerKwh() == null) {

            BigDecimal divider = BigDecimal.ONE.add(
                    entity.getVatPercent()
                            .divide(ONE_HUNDRED, 10, RoundingMode.HALF_UP)
            );

            entity.setNetRatePerKwh(
                    entity.getGrossRatePerKwh().divide(divider, 4, RoundingMode.HALF_UP)
            );
        }
    }
}
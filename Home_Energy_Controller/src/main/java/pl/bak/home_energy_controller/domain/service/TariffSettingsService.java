package pl.bak.home_energy_controller.domain.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.bak.home_energy_controller.domain.dao.TariffSettingsRepository;
import pl.bak.home_energy_controller.domain.model.TariffSettings;
import pl.bak.home_energy_controller.mappers.dto.TariffSettingsDto;

import java.math.BigDecimal;

@Service
public class TariffSettingsService {

    private final TariffSettingsRepository repository;

    public TariffSettingsService(TariffSettingsRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public TariffSettingsDto getCurrentSettings() {
        TariffSettings entity = repository.findById(1L)
                .orElseGet(() -> {
                    TariffSettings t = new TariffSettings();
                    t.setId(1L);
                    return t;
                });

        TariffSettingsDto dto = new TariffSettingsDto();
        dto.setNetRatePerKwh(entity.getNetRatePerKwh());
        dto.setGrossRatePerKwh(entity.getGrossRatePerKwh());
        dto.setVatPercent(entity.getVatPercent());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    @Transactional
    public TariffSettingsDto updateSettings(TariffSettingsDto dto) {
        TariffSettings entity = repository.findById(1L)
                .orElseGet(() -> {
                    TariffSettings t = new TariffSettings();
                    t.setId(1L);
                    return t;
                });

        // UZUPEŁNIANIE – nie nadpisuj istniejących wartości nullami
        if (dto.getNetRatePerKwh() != null) {
            entity.setNetRatePerKwh(dto.getNetRatePerKwh());
        }
        if (dto.getGrossRatePerKwh() != null) {
            entity.setGrossRatePerKwh(dto.getGrossRatePerKwh());
        }
        if (dto.getVatPercent() != null) {
            entity.setVatPercent(dto.getVatPercent());
        }

        // DODATKOWO: można tu wyliczyć brakującą stawkę z netto/brutto + VAT,
        // jeśli chcesz mieć zawsze spójność.
        // Np. jeśli mamy gross i VAT, a net jest null:
        if (entity.getGrossRatePerKwh() != null &&
                entity.getVatPercent() != null &&
                entity.getNetRatePerKwh() == null) {
            BigDecimal hundred = BigDecimal.valueOf(100);
            BigDecimal divider = BigDecimal.ONE.add(
                    entity.getVatPercent().divide(hundred)
            );
            entity.setNetRatePerKwh(
                    entity.getGrossRatePerKwh().divide(divider, 4, BigDecimal.ROUND_HALF_UP)
            );
        }

        TariffSettings saved = repository.save(entity);

        TariffSettingsDto resp = new TariffSettingsDto();
        resp.setNetRatePerKwh(saved.getNetRatePerKwh());
        resp.setGrossRatePerKwh(saved.getGrossRatePerKwh());
        resp.setVatPercent(saved.getVatPercent());
        resp.setUpdatedAt(saved.getUpdatedAt());

        return resp;
    }
}

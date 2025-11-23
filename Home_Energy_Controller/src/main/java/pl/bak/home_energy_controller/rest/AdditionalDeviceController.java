package pl.bak.home_energy_controller.rest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.bak.home_energy_controller.domain.dao.AdditionalDeviceRepository;
import pl.bak.home_energy_controller.domain.model.AdditionalDevice;
import pl.bak.home_energy_controller.mappers.dto.AdditionalDeviceDto;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/additional-devices")
public class AdditionalDeviceController {

    private final AdditionalDeviceRepository additionalDeviceRepository;

    public AdditionalDeviceController(AdditionalDeviceRepository additionalDeviceRepository) {
        this.additionalDeviceRepository = additionalDeviceRepository;
    }

    @GetMapping
    public List<AdditionalDeviceDto> getAll() {
        return additionalDeviceRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdditionalDeviceDto> getById(@PathVariable Long id) {
        Optional<AdditionalDevice> opt = additionalDeviceRepository.findById(id);
        return opt.map(device -> ResponseEntity.ok(toDto(device)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<AdditionalDeviceDto> create(@RequestBody AdditionalDeviceDto dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        AdditionalDevice entity = new AdditionalDevice();
        entity.setName(dto.getName());
        entity.setCategory(dto.getCategory());
        entity.setRatedPowerW(dto.getRatedPowerW());
        entity.setDescription(dto.getDescription());

        AdditionalDevice saved = additionalDeviceRepository.save(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdditionalDeviceDto> update(@PathVariable Long id,
                                                      @RequestBody AdditionalDeviceDto dto) {
        Optional<AdditionalDevice> opt = additionalDeviceRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        AdditionalDevice entity = opt.get();

        if (dto.getName() != null && !dto.getName().isBlank()) {
            entity.setName(dto.getName());
        }
        if (dto.getCategory() != null) {
            entity.setCategory(dto.getCategory());
        }
        if (dto.getRatedPowerW() != null) {
            entity.setRatedPowerW(dto.getRatedPowerW());
        }
        if (dto.getDescription() != null) {
            entity.setDescription(dto.getDescription());
        }

        AdditionalDevice saved = additionalDeviceRepository.save(entity);
        return ResponseEntity.ok(toDto(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!additionalDeviceRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        additionalDeviceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private AdditionalDeviceDto toDto(AdditionalDevice entity) {
        AdditionalDeviceDto dto = new AdditionalDeviceDto();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setCategory(entity.getCategory());
        dto.setRatedPowerW(entity.getRatedPowerW());
        dto.setDescription(entity.getDescription());
        return dto;
    }
}
package pl.bak.home_energy_controller.rest;

import org.springframework.web.bind.annotation.*;
import pl.bak.home_energy_controller.advisor.EnergyAdvisorService;
import pl.bak.home_energy_controller.mappers.dto.AdviceDto;

import java.util.List;

@RestController
@RequestMapping("/api/advisor")
public class EnergyAdvisorController {

    private final EnergyAdvisorService energyAdvisorService;

    public EnergyAdvisorController(EnergyAdvisorService energyAdvisorService) {
        this.energyAdvisorService = energyAdvisorService;
    }

    @GetMapping("/monthly")
    public List<AdviceDto> getMonthlyAdvice() {
        return energyAdvisorService.generateMonthlyAdvice();
    }
}

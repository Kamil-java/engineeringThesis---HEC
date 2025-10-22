package pl.bak.home_energy_controller;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HomeEnergyControllerApplication {

    public static void main(String[] args) {
        SpringApplication.run(HomeEnergyControllerApplication.class, args);
    }

}

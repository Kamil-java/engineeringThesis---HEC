package pl.bak.home_energy_controller.db.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "device")
public class Device {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private String id;

    private String name;
    private String category;
    private String model;
    private boolean online;

    private Double currentPower;   // W
    private Double currentCurrent; // A
    private Double currentVoltage; // V
    private Double totalEnergy;    // kWh

    private LocalDateTime lastUpdated;

    public Device() {
    }

    public Device(String id, String name, String category, String model, boolean online, Double currentPower, Double currentCurrent, Double currentVoltage, Double totalEnergy, LocalDateTime lastUpdated) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.model = model;
        this.online = online;
        this.currentPower = currentPower;
        this.currentCurrent = currentCurrent;
        this.currentVoltage = currentVoltage;
        this.totalEnergy = totalEnergy;
        this.lastUpdated = lastUpdated;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public boolean isOnline() {
        return online;
    }

    public void setOnline(boolean online) {
        this.online = online;
    }

    public Double getCurrentPower() {
        return currentPower;
    }

    public void setCurrentPower(Double currentPower) {
        this.currentPower = currentPower;
    }

    public Double getCurrentCurrent() {
        return currentCurrent;
    }

    public void setCurrentCurrent(Double currentCurrent) {
        this.currentCurrent = currentCurrent;
    }

    public Double getCurrentVoltage() {
        return currentVoltage;
    }

    public void setCurrentVoltage(Double currentVoltage) {
        this.currentVoltage = currentVoltage;
    }

    public Double getTotalEnergy() {
        return totalEnergy;
    }

    public void setTotalEnergy(Double totalEnergy) {
        this.totalEnergy = totalEnergy;
    }

    public LocalDateTime getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(LocalDateTime lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}

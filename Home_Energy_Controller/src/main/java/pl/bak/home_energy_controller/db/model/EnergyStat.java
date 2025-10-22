package pl.bak.home_energy_controller.db.model;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "energy_stat")
public class EnergyStat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    private Device device;

    private LocalDate date;

    private Double current;  // mA
    private Double voltage;  // V
    private Double power;    // W
    private Double energy;   // Wh

    @Enumerated(EnumType.STRING)
    private EnergyPeriodType type; // DAILY / WEEKLY / MONTHLY


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Device getDevice() {
        return device;
    }

    public void setDevice(Device device) {
        this.device = device;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public Double getCurrent() {
        return current;
    }

    public void setCurrent(Double current) {
        this.current = current;
    }

    public Double getVoltage() {
        return voltage;
    }

    public void setVoltage(Double voltage) {
        this.voltage = voltage;
    }

    public Double getPower() {
        return power;
    }

    public void setPower(Double power) {
        this.power = power;
    }

    public Double getEnergy() {
        return energy;
    }

    public void setEnergy(Double energy) {
        this.energy = energy;
    }

    public EnergyPeriodType getType() {
        return type;
    }

    public void setType(EnergyPeriodType type) {
        this.type = type;
    }
}


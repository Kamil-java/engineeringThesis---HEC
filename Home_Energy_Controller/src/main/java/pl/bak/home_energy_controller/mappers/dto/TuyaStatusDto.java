package pl.bak.home_energy_controller.mappers.dto;

public class TuyaStatusDto {
    private String code;
    private Object value;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Object getValue() {
        return value;
    }

    public void setValue(Object value) {
        this.value = value;
    }
}


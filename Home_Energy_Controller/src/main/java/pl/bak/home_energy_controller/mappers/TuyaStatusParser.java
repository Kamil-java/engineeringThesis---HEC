package pl.bak.home_energy_controller.mappers;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class TuyaStatusParser {

    @SuppressWarnings("unchecked")
    public ParsedValues parse(Map<String, Object> src) {
        ParsedValues pv = new ParsedValues();

        Object statusObj = src.get("status");
        if (statusObj instanceof List<?> list) {
            for (Object o : list) {
                if (!(o instanceof Map)) continue;
                Map<String, Object> st = (Map<String, Object>) o;
                String code = (String) st.get("code");
                Object value = st.get("value");
                if (value == null) continue;

                switch (code) {
                    case "add_ele" -> pv.energyKwh = toInt(value) / 1000.0; // scale 3
                    case "cur_power" -> pv.powerW = toInt(value) / 10.0;    // scale 1
                    case "cur_voltage" -> pv.voltageV = toInt(value) / 10.0;// scale 1
                    case "cur_current" -> pv.currentMa = toInt(value);      // mA
                }
            }
        }
        return pv;
    }

    private int toInt(Object raw) {
        if (raw instanceof Integer i) return i;
        if (raw instanceof Number n) return n.intValue();
        return Integer.parseInt(raw.toString());
    }

    public static class ParsedValues {
        public Double energyKwh;
        public Double powerW;
        public Double voltageV;
        public Integer currentMa;
    }
}

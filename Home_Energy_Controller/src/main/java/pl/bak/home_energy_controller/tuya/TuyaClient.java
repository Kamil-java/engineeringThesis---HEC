package  pl.bak.home_energy_controller.tuya;

import jakarta.annotation.PostConstruct;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import pl.bak.home_energy_controller.config.TuyaConfig;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class TuyaClient {

    private final TuyaConfig config;
    private String accessToken;
    private final RestTemplate restTemplate = new RestTemplate();

    public TuyaClient(TuyaConfig config) {
        this.config = config;
    }

    @PostConstruct
    public void login() throws Exception {
        long t = System.currentTimeMillis();
        String nonce = UUID.randomUUID().toString();
        String stringToSign = "GET\n" +
                "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n" +
                "\n" +
                "/v1.0/token?grant_type=1";

        String str = config.getClientId() + t + nonce + stringToSign;
        String sign = hmacSHA256(str, config.getClientSecret());

        String url = config.getEndpoint() + "/v1.0/token?grant_type=1";

        HttpHeaders headers = new HttpHeaders();
        headers.add("client_id", config.getClientId());
        headers.add("sign", sign);
        headers.add("sign_method", "HMAC-SHA256");
        headers.add("t", String.valueOf(t));
        headers.add("nonce", nonce);

        HttpEntity<String> entity = new HttpEntity<>("", headers);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

        JSONObject json = new JSONObject(response.getBody());
        if (json.getBoolean("success")) {
            accessToken = json.getJSONObject("result").getString("access_token");
            System.out.println("✅ [TuyaClient] Logged in. Access token: " + accessToken);
        } else {
            throw new RuntimeException("❌ Tuya login failed: " + json);
        }
    }

    public List<Map<String, Object>> getAllDevices() throws Exception {
        String path = "/v1.0/users/" + config.getUserUid() + "/devices";
        String url = config.getEndpoint() + path;
        HttpHeaders headers = createSignedHeaders("GET", path);
        HttpEntity<String> entity = new HttpEntity<>("", headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

        JSONObject json = new JSONObject(response.getBody());

        if (!json.optBoolean("success", false)) {
            System.err.println("❌ Tuya API error: " + json);
            return Collections.emptyList();
        }

        JSONArray result = json.optJSONArray("result");
        if (result == null) {
            System.err.println("⚠️ No 'result' field found in response: " + json);
            return Collections.emptyList();
        }

        List<Map<String, Object>> devices = new ArrayList<>();
        for (int i = 0; i < result.length(); i++) {
            JSONObject obj = result.getJSONObject(i);
            devices.add(obj.toMap());
        }

        System.out.println("[📡] Devices fetched: " + devices.size());
        return devices;
    }

    public List<Map<String, Object>> getDevices() throws Exception {
        if (accessToken == null) throw new IllegalStateException("You must login first");

        String path = "/v1.0/users/" + config.getUserUid() + "/devices";
        String url = config.getEndpoint() + path;

        HttpHeaders headers = createSignedHeaders("GET", path);
        HttpEntity<String> entity = new HttpEntity<>("", headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        System.out.println("[📡] Devices list: " + response.getBody());
        return null;
    }

    public JSONObject getDeviceDetails(String deviceId) throws Exception {
        if (accessToken == null) throw new IllegalStateException("You must login first");

        String path = "/v1.0/devices/" + deviceId;
        String url = config.getEndpoint() + path;

        HttpHeaders headers = createSignedHeaders("GET", path);
        HttpEntity<String> entity = new HttpEntity<>("", headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        JSONObject json = new JSONObject(response.getBody());
        System.out.println(json.toString());

        if (!json.optBoolean("success", false)) {
            throw new RuntimeException("❌ Failed to fetch device details: " + json);
        }
        return json.getJSONObject("result");
    }

    public Map<String, Object> getDeviceStatus(String deviceId) throws Exception {
        if (accessToken == null) {
            throw new IllegalStateException("Not logged in – missing access token");
        }

        long t = System.currentTimeMillis();
        String nonce = UUID.randomUUID().toString();
        String path = "/v1.0/devices/" + deviceId + "/status";
        String stringToSign = "GET\n" +
                "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n" +
                "\n" + path;

        String str = config.getClientId() + accessToken + t + nonce + stringToSign;
        String sign = hmacSHA256(str, config.getClientSecret());

        String url = config.getEndpoint() + path;

        var headers = new org.springframework.http.HttpHeaders();
        headers.add("client_id", config.getClientId());
        headers.add("sign", sign);
        headers.add("sign_method", "HMAC-SHA256");
        headers.add("t", String.valueOf(t));
        headers.add("nonce", nonce);
        headers.add("access_token", accessToken);
        headers.add("Content-Type", "application/json");

        var entity = new org.springframework.http.HttpEntity<>("", headers);
        var response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, String.class);

        String body = response.getBody();
        JSONObject json = new JSONObject(body);

        if (!json.getBoolean("success")) {
            throw new RuntimeException("❌ Failed to get device status: " + body);
        }

        JSONArray resultArray = json.getJSONArray("result");
        Map<String, Object> statusMap = new HashMap<>();

        for (int i = 0; i < resultArray.length(); i++) {
            JSONObject item = resultArray.getJSONObject(i);
            String code = item.getString("code");
            Object value = item.get("value");
            statusMap.put(code, value);
        }

        return statusMap;
    }

    private HttpHeaders createSignedHeaders(String method, String path) throws Exception {
        long t = System.currentTimeMillis();
        String nonce = UUID.randomUUID().toString();
        String stringToSign = method + "\n" +
                "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n" +
                "\n" +
                path;

        String signStr = config.getClientId() + accessToken + t + nonce + stringToSign;
        String sign = hmacSHA256(signStr, config.getClientSecret());

        HttpHeaders headers = new HttpHeaders();
        headers.add("client_id", config.getClientId());
        headers.add("sign", sign);
        headers.add("sign_method", "HMAC-SHA256");
        headers.add("t", String.valueOf(t));
        headers.add("nonce", nonce);
        headers.add("access_token", accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private String hmacSHA256(String data, String key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKey);
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString().toUpperCase();
    }
}
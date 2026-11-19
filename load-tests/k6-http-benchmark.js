import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 100 },  // Ramp to 100 VUs
    { duration: "1m", target: 500 },   // Scale to 500 VUs
    { duration: "1m", target: 1000 },  // Stress at 1000 VUs
    { duration: "30s", target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ["p(95)<300", "p(99)<800"], // 95% under 300ms, 99% under 800ms
    http_req_failed: ["rate<0.01"],                 // Less than 1% errors
  },
};

const BASE_URL = __ENV.TARGET_URL || "http://localhost/api";

export default function () {
  // 1. Health check probe
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health status is 200": (r) => r.status === 200,
    "database is connected": (r) => {
      try {
        return JSON.parse(r.body).services.database === "connected";
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1);
}

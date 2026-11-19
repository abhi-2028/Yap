# Load Testing & Performance Validation Suite

This directory contains benchmarking scripts for evaluating Yap under increasing load (100, 500, and 1,000+ concurrent users).

---

## 1. REST API Load Testing with k6

### Prerequisites
Install k6:
- **Windows (winget):** `winget install k6 --source winget`
- **Mac (brew):** `brew install k6`
- **Linux:** `sudo apt install k6`

### Running the HTTP Benchmark
Run against local Docker load balancer:
```bash
k6 run k6-http-benchmark.js
```

Or pass a custom target URL:
```bash
k6 run -e TARGET_URL="http://localhost:5000/api" k6-http-benchmark.js
```

### Metrics Measured
- **`http_req_duration`:** p50, p90, p95, p99 latencies.
- **`http_req_failed`:** Percentage of dropped or 5xx requests (target: < 0.1%).
- **`http_reqs`:** Total throughput in requests per second (RPS).

---

## 2. WebSocket Concurrent Connection Benchmark

### Running the Socket Benchmark
```bash
npm install --prefix ../frontend
node ws-benchmark.js 500 http://localhost
```

Arguments:
- `500`: Number of concurrent connections to ramp up.
- `http://localhost`: Target URL (Nginx or backend instance).

### Metrics Measured
- Concurrent open TCP sockets without connection refusal.
- Handshake latency distribution.
- Reconnection stability.

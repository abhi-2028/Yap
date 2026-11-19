import { io } from "socket.io-client";

/**
 * WebSocket Concurrent Connection & Latency Benchmark Tool
 * Usage: node ws-benchmark.js [connections] [target_url]
 */

const TARGET_URL = process.argv[3] || "http://localhost";
const TOTAL_CLIENTS = parseInt(process.argv[2], 10) || 100;

console.log(`Starting WebSocket Benchmark against ${TARGET_URL} with ${TOTAL_CLIENTS} concurrent clients...`);

const sockets = [];
let connectedCount = 0;
let disconnectedCount = 0;
let messagesReceived = 0;

const startTime = Date.now();

for (let i = 0; i < TOTAL_CLIENTS; i++) {
  setTimeout(() => {
    const socket = io(TARGET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 3,
    });

    socket.on("connect", () => {
      connectedCount++;
      if (connectedCount % 50 === 0 || connectedCount === TOTAL_CLIENTS) {
        console.log(`[Connected]: ${connectedCount}/${TOTAL_CLIENTS} clients (${Date.now() - startTime}ms)`);
      }
    });

    socket.on("newMessage", () => {
      messagesReceived++;
    });

    socket.on("disconnect", () => {
      disconnectedCount++;
    });

    socket.on("connect_error", (err) => {
      // Expected if testing unauthenticated handshakes
    });

    sockets.push(socket);
  }, i * 20); // 20ms stagger to avoid artificial thundering herd on local ports
}

// Print summary after 30 seconds
setTimeout(() => {
  console.log("\n--- BENCHMARK RESULTS ---");
  console.log(`Total Attempted: ${TOTAL_CLIENTS}`);
  console.log(`Active Connected: ${connectedCount}`);
  console.log(`Disconnected: ${disconnectedCount}`);
  console.log(`Messages Processed: ${messagesReceived}`);
  console.log(`Duration: ${(Date.now() - startTime) / 1000}s`);

  sockets.forEach((s) => s.close());
  process.exit(0);
}, 30000);

import { haversineDistance } from "./src/lib/geo-utils";

// Test data
const nyc = { lat: 40.7128, lng: -74.0060 };
const philly = { lat: 39.9526, lng: -75.1652 };
const london = { lat: 51.5074, lng: -0.1278 };
const paris = { lat: 48.8566, lng: 2.3522 };

console.log("Running Haversine tests...");

// Test 1: NYC to Philly (~130 km)
const distNYCPhilly = haversineDistance(
  nyc.lat,
  nyc.lng,
  philly.lat,
  philly.lng
);
console.log(`NYC to Philly: ${distNYCPhilly.toFixed(2)} km (Expected ~130 km)`);
if (distNYCPhilly > 120 && distNYCPhilly < 140) {
  console.log("✅ Test 1 Passed");
} else {
  console.error("❌ Test 1 Failed");
  process.exit(1);
}

// Test 2: London to Paris (~340 km)
const distLondonParis = haversineDistance(
  london.lat,
  london.lng,
  paris.lat,
  paris.lng
);
console.log(`London to Paris: ${distLondonParis.toFixed(2)} km (Expected ~340 km)`);
if (distLondonParis > 330 && distLondonParis < 350) {
  console.log("✅ Test 2 Passed");
} else {
  console.error("❌ Test 2 Failed");
  process.exit(1);
}

// Test 3: Same point (0 km)
const distSame = haversineDistance(nyc.lat, nyc.lng, nyc.lat, nyc.lng);
console.log(`Same point: ${distSame} km (Expected 0 km)`);
if (distSame === 0) {
  console.log("✅ Test 3 Passed");
} else {
  console.error("❌ Test 3 Failed");
  process.exit(1);
}

// Test 4: Far away (NYC to London ~5500 km)
const distNYCLondon = haversineDistance(nyc.lat, nyc.lng, london.lat, london.lng);
console.log(`NYC to London: ${distNYCLondon.toFixed(2)} km (Expected ~5500 km)`);
if (distNYCLondon > 5400 && distNYCLondon < 5600) {
  console.log("✅ Test 4 Passed");
} else {
  console.error("❌ Test 4 Failed");
  process.exit(1);
}

console.log("All tests passed successfully!");

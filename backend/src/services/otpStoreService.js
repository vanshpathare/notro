// services/otpStoreService.js
import Redis from "ioredis";

const fallbackStore = new Map();

// Configure Redis with quick failover timeouts
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
  connectTimeout: 2000,
  lazyConnect: true,
});

let isRedisConnected = false;

redis.on("connect", () => {
  isRedisConnected = true;
  console.log("Redis connected successfully.");
});

redis.on("error", (err) => {
  isRedisConnected = false;
  console.warn("Redis unavailable, using in-memory fallback:", err.message);
});

// Attempt connection without crashing app if offline
redis.connect().catch(() => {
  isRedisConnected = false;
});

/**
 * Save OTP for a 10-minute validity window
 */
export async function saveOTP(phone, code) {
  const ttlSeconds = 600; // 10 minutes

  if (isRedisConnected) {
    try {
      await redis.set(`otp:${phone}`, code, "EX", ttlSeconds);
      return;
    } catch {
      // Failover to memory if Redis write fails
    }
  }

  // In-memory fallback
  fallbackStore.set(phone, {
    code,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  setTimeout(() => {
    fallbackStore.delete(phone);
  }, ttlSeconds * 1000);
}

/**
 * Verify OTP
 */
export async function verifyOTP(phone, inputCode) {
  if (isRedisConnected) {
    try {
      const storedCode = await redis.get(`otp:${phone}`);
      if (storedCode && storedCode === inputCode.trim()) {
        await redis.del(`otp:${phone}`);
        return { valid: true };
      }
    } catch {
      // Failover to memory if Redis read fails
    }
  }

  const record = fallbackStore.get(phone);
  if (!record) {
    return { valid: false, error: "OTP expired or not found" };
  }

  if (Date.now() > record.expiresAt) {
    fallbackStore.delete(phone);
    return { valid: false, error: "OTP expired" };
  }

  if (record.code !== inputCode.trim()) {
    return { valid: false, error: "Invalid verification code" };
  }

  fallbackStore.delete(phone);
  return { valid: true };
}


import "dotenv/config";
import { createClient } from "redis";

// Create a shared Redis client for the application.
const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

// Log connection errors without exposing credentials.
redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

// Connect to Redis if the client is not already connected.
export const connectRedis = async () => {
  if (redis.isOpen) {
    return;
  }

  await redis.connect();
  console.log("Redis connected successfully.");
};

export default redis;

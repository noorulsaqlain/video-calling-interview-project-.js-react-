import dotenv from "dotenv";

dotenv.config();

const requiredEnv = ["DB_URL"];

for (const key of requiredEnv) {
  if (!process.env[key] || !process.env[key].trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const ENV = {
  PORT: Number(process.env.PORT) || 3000,
  DB_URL: process.env.DB_URL.trim(),
  DB_URL_ALT: process.env.DB_URL_ALT?.trim(),
  NODE_ENV: (process.env.NODE_ENV || "development").trim(),
};

import { config as dotenv } from "dotenv";

dotenv({ quiet: true });

export const ZEROEX_API_URL = "https://api.0x.org";

export function fetchApiKey(): string {
  const apiKey = process.env.ZEROEX_API_KEY;
  if (!apiKey) {
    throw new Error("ZEROEX_API_KEY is not set. Copy .env.example to .env and set it.");
  }
  return apiKey;
}

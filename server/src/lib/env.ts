import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the single, shared .env file from the project root so the client
// and server never have divergent configuration.
dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

function readEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  port: Number(readEnv("PORT", "3001")),
  nodeEnv: readEnv("NODE_ENV", "development"),
  clientOrigin: readEnv(
    "CLIENT_ORIGIN",
    "http://localhost:5173",
  ),
  supabaseUrl:
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL,
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY,

  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: readEnv("GEMINI_MODEL", "gemini-3.6-flash"),
};
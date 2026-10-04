import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { resolve } from "path";

const dbPath = resolve(import.meta.dir, "../../data.db");
export const sqlite = new Database(dbPath, { create: true });

// Enable Write-Ahead Logging (WAL) for concurrency & performance
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");
sqlite.exec("PRAGMA busy_timeout = 5000;");

export const db = drizzle(sqlite, { schema });

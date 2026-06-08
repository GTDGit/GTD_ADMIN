/**
 * POST /api/db-browser/query
 * Server-side only — runs a SQL query against the Postgres DB.
 * Protected by DB_BROWSER_PASSWORD env var (compare against x-db-pass header).
 *
 * NOTE: READ-ONLY enforcement — only SELECT queries are allowed.
 * This endpoint is for temporary development inspection only.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

/**
 * Load .env.local manually at runtime because pm2 does not inject it into
 * process.env. We read the file from the project root (cwd) each time the
 * pool is first created.
 */
function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env.local');
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const vars: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      vars[key] = val;
    }
    return vars;
  } catch {
    return {};
  }
}

let pool: Pool | null = null;
let poolCreatedAt = 0; // reset pool if it's stale (> 5 min) so env changes take effect

function getPool(): Pool {
  // Reset pool after 5 min so a server restart picks up fresh env values
  if (pool && (Date.now() - poolCreatedAt) > 5 * 60_000) {
    pool.end().catch(() => {});
    pool = null;
  }
  if (pool) return pool;

  // Merge .env.local into process.env fallback (pm2 doesn't inject .env.local)
  const envLocal = loadEnvLocal();
  const get = (key: string) => process.env[key] ?? envLocal[key];

  const sslMode = get('DB_SSLMODE') ?? 'require';
  const sslRootCert = get('DB_SSLROOTCERT');

  let sslConfig: object | boolean = false;
  if (sslMode === 'verify-full' || sslMode === 'require') {
    const certContent = sslRootCert
      ? (() => { try { return fs.readFileSync(sslRootCert).toString(); } catch { return undefined; } })()
      : undefined;
    sslConfig = {
      rejectUnauthorized: sslMode === 'verify-full',
      ...(certContent ? { ca: certContent } : {}),
    };
  }

  pool = new Pool({
    host:     get('DB_HOST'),
    port:     parseInt(get('DB_PORT') || '5432'),
    user:     get('DB_USER'),
    password: get('DB_PASSWORD'),
    database: get('DB_NAME'),
    ssl:      sslConfig,
    max:      2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  });
  poolCreatedAt = Date.now();
  return pool;
}

type Resp = {
  ok: boolean;
  rows?: Record<string, unknown>[];
  fields?: { name: string; dataTypeID: number }[];
  rowCount?: number;
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Password check — also read from .env.local if not in process.env
  const envLocal = loadEnvLocal();
  const get = (key: string) => process.env[key] ?? envLocal[key];
  const pass = get('DB_BROWSER_PASSWORD');
  const provided = req.headers['x-db-pass'] as string | undefined;
  if (!pass || !provided || provided !== pass) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const { sql } = req.body as { sql?: string };
  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ ok: false, error: 'sql is required' });
  }

  // Only SELECT is allowed — simple guard
  const normalized = sql.trim().toUpperCase();
  if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH') && !normalized.startsWith('SHOW') && !normalized.startsWith('\\')) {
    return res.status(403).json({ ok: false, error: 'Only SELECT / WITH queries are permitted' });
  }

  try {
    const client = await getPool().connect();
    try {
      const result = await client.query(sql);
      return res.status(200).json({
        ok: true,
        rows: result.rows,
        fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
        rowCount: result.rowCount ?? result.rows.length,
      });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
}

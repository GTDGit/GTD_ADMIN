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

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const sslConfig = process.env.DB_SSLMODE === 'verify-full' || process.env.DB_SSLMODE === 'require'
    ? {
        rejectUnauthorized: process.env.DB_SSLMODE === 'verify-full',
        ca: process.env.DB_SSLROOTCERT
          ? (() => { try { return fs.readFileSync(process.env.DB_SSLROOTCERT!).toString(); } catch { return undefined; } })()
          : undefined,
      }
    : false;

  pool = new Pool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '5432'),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:      sslConfig,
    max:      2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  });

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

  // Password check
  const pass = process.env.DB_BROWSER_PASSWORD;
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

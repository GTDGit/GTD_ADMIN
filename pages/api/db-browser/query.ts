/**
 * POST /api/db-browser/query
 * Server-side DB proxy for the development DB browser.
 * Protected by DB_BROWSER_PASSWORD.
 *
 * Body shapes:
 *  { action: 'query',  sql: string }
 *  { action: 'update', table: string, schema: string,
 *    pkCol: string, pkVal: unknown,
 *    col: string, val: string }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

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
      vars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
    return vars;
  } catch { return {}; }
}

let pool: Pool | null = null;
let poolAt = 0;

function getPool(): Pool {
  if (pool && (Date.now() - poolAt) > 5 * 60_000) { pool.end().catch(() => {}); pool = null; }
  if (pool) return pool;

  const env = loadEnvLocal();
  const g = (k: string) => process.env[k] ?? env[k];
  const sslMode = g('DB_SSLMODE') ?? 'require';
  const cert = g('DB_SSLROOTCERT');
  let ssl: object | boolean = false;
  if (sslMode === 'verify-full' || sslMode === 'require') {
    ssl = {
      rejectUnauthorized: sslMode === 'verify-full',
      ...(cert ? { ca: (() => { try { return fs.readFileSync(cert).toString(); } catch { return undefined; } })() } : {}),
    };
  }

  pool = new Pool({
    host: g('DB_HOST'), port: parseInt(g('DB_PORT') || '5432'),
    user: g('DB_USER'), password: g('DB_PASSWORD'), database: g('DB_NAME'),
    ssl, max: 2, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 8_000,
  });
  poolAt = Date.now();
  return pool;
}

type Resp = { ok: boolean; rows?: Record<string, unknown>[]; fields?: { name: string; dataTypeID: number }[]; rowCount?: number; error?: string; };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const env = loadEnvLocal();
  const g = (k: string) => process.env[k] ?? env[k];
  const pass = g('DB_BROWSER_PASSWORD');
  const provided = req.headers['x-db-pass'] as string | undefined;
  if (!pass || !provided || provided !== pass) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const body = req.body as Record<string, unknown>;
  const action = (body.action as string) || 'query';

  const client = await getPool().connect();
  try {
    // ── SELECT / custom query ──────────────────────────────────────────────
    if (action === 'query') {
      const sql = body.sql as string | undefined;
      if (!sql) return res.status(400).json({ ok: false, error: 'sql is required' });
      const norm = sql.trim().toUpperCase();
      if (!norm.startsWith('SELECT') && !norm.startsWith('WITH') && !norm.startsWith('SHOW')) {
        return res.status(403).json({ ok: false, error: 'Only SELECT/WITH queries are permitted' });
      }
      const result = await client.query(sql);
      return res.status(200).json({
        ok: true,
        rows: result.rows,
        fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
        rowCount: result.rowCount ?? result.rows.length,
      });
    }

    // ── UPDATE single cell ────────────────────────────────────────────────
    if (action === 'update') {
      const { schema, table, pkCol, pkVal, col, val } = body as {
        schema: string; table: string; pkCol: string; pkVal: unknown; col: string; val: string;
      };
      if (!schema || !table || !pkCol || pkVal === undefined || !col) {
        return res.status(400).json({ ok: false, error: 'schema, table, pkCol, pkVal, col are required' });
      }
      // Sanitize identifiers — only allow word chars and hyphens
      const safe = (s: string) => /^[\w\-]+$/.test(s) ? s : null;
      if (!safe(schema) || !safe(table) || !safe(pkCol) || !safe(col)) {
        return res.status(400).json({ ok: false, error: 'Invalid identifier' });
      }
      // val == '' treated as NULL, 'NULL' also treated as NULL
      const newVal = (val === 'NULL' || val === null) ? null : val;
      const sql = `UPDATE "${schema}"."${table}" SET "${col}" = $1 WHERE "${pkCol}" = $2`;
      await client.query(sql, [newVal, pkVal]);
      return res.status(200).json({ ok: true, rowCount: 1 });
    }

    return res.status(400).json({ ok: false, error: `Unknown action: ${action}` });

  } catch (err: unknown) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  } finally {
    client.release();
  }
}

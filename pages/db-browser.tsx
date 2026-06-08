/**
 * DB Browser — temporary development tool for inspecting the Postgres database.
 * Password-gated via DB_BROWSER_PASSWORD env var (sent as x-db-pass header).
 * DELETE THIS PAGE before production.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TableInfo {
  schema: string;
  name: string;
  rows: number | null;
}
interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}
interface QueryResult {
  rows: Record<string, unknown>[];
  fields: { name: string; dataTypeID: number }[];
  rowCount: number;
}

// ─── SQL templates ─────────────────────────────────────────────────────────
const SQL_TABLES = `
SELECT table_schema AS schema, table_name AS name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog','information_schema')
  AND table_type = 'BASE TABLE'
ORDER BY table_schema, table_name;
`.trim();

const sqlColumns = (schema: string, table: string) => `
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = '${schema}' AND table_name = '${table}'
ORDER BY ordinal_position;
`.trim();

const sqlCount = (schema: string, table: string) =>
  `SELECT COUNT(*) AS cnt FROM "${schema}"."${table}";`;

const sqlPreview = (schema: string, table: string, limit = 50) =>
  `SELECT * FROM "${schema}"."${table}" ORDER BY 1 LIMIT ${limit};`;

// ─── Main component ───────────────────────────────────────────────────────
export default function DbBrowser() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState('');

  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selected, setSelected] = useState<TableInfo | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [previewResult, setPreviewResult] = useState<QueryResult | null>(null);
  const [previewLimit, setPreviewLimit] = useState(50);

  const [customSql, setCustomSql] = useState('');
  const [customResult, setCustomResult] = useState<QueryResult | null>(null);
  const [customError, setCustomError] = useState('');

  const [loading, setLoading] = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'structure' | 'data' | 'query'>('structure');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Query helper ──────────────────────────────────────────────────────────
  const runQuery = useCallback(async (sql: string): Promise<QueryResult> => {
    const res = await fetch('/api/db-browser/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-db-pass': password },
      body: JSON.stringify({ sql }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error ?? 'Query failed');
    return { rows: data.rows ?? [], fields: data.fields ?? [], rowCount: data.rowCount ?? 0 };
  }, [password]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleAuth = async () => {
    setAuthErr('');
    try {
      await runQuery('SELECT 1');
      setAuthed(true);
    } catch {
      setAuthErr('Wrong password or DB connection error.');
    }
  };

  // ── Load tables ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    runQuery(SQL_TABLES).then(async (r) => {
      const list: TableInfo[] = r.rows.map(row => ({
        schema: String(row.schema),
        name:   String(row.name),
        rows:   null,
      }));
      // Fetch row counts in background (batched)
      const counts: TableInfo[] = await Promise.all(
        list.map(async (t) => {
          try {
            const c = await runQuery(sqlCount(t.schema, t.name));
            return { ...t, rows: Number((c.rows[0] as Record<string, unknown>)?.cnt ?? 0) };
          } catch {
            return t;
          }
        })
      );
      setTables(counts);
    }).catch(() => {});
  }, [authed, runQuery]);

  // ── Select table ──────────────────────────────────────────────────────────
  const selectTable = async (t: TableInfo) => {
    setSelected(t);
    setActiveTab('structure');
    setLoading(true);
    setPreviewResult(null);
    setColumns([]);
    try {
      const res = await runQuery(sqlColumns(t.schema, t.name));
      setColumns(res.rows as unknown as ColumnInfo[]);
    } catch {
      setColumns([]);
    }
    setLoading(false);
  };

  const loadPreview = async (limit = previewLimit) => {
    if (!selected) return;
    setLoading(true);
    setPreviewResult(null);
    try {
      const res = await runQuery(sqlPreview(selected.schema, selected.name, limit));
      setPreviewResult(res);
      setCustomSql(sqlPreview(selected.schema, selected.name, limit));
    } catch (err) {
      setCustomError(String(err));
    }
    setLoading(false);
  };

  const runCustom = async () => {
    if (!customSql.trim()) return;
    setLoading(true);
    setCustomError('');
    setCustomResult(null);
    try {
      const res = await runQuery(customSql);
      setCustomResult(res);
    } catch (err) {
      setCustomError(String(err));
    }
    setLoading(false);
  };

  const filteredTables = tables.filter(t =>
    `${t.schema}.${t.name}`.toLowerCase().includes(sidebarFilter.toLowerCase())
  );

  // ─── Auth screen ─────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <>
        <Head><title>DB Browser — GTD Admin</title></Head>
        <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Consolas', 'Monaco', monospace" }}>
          <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '2rem', width: 360 }}>
            <div style={{ color: '#60a5fa', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🛢 DB Browser</div>
            <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 24 }}>Temporary development tool — GTD Postgres</div>
            <label style={{ color: '#9ca3af', fontSize: 13 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              style={{ display: 'block', width: '100%', marginTop: 6, marginBottom: 16, padding: '8px 12px', background: '#111827', border: '1px solid #374151', borderRadius: 6, color: '#f3f4f6', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' }}
              placeholder="Enter DB_BROWSER_PASSWORD"
              autoFocus
            />
            {authErr && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 12 }}>{authErr}</div>}
            <button
              onClick={handleAuth}
              style={{ width: '100%', padding: '8px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}
            >
              Connect
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Main layout ──────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>DB Browser — GTD Admin</title></Head>
      <div style={{ display: 'flex', height: '100vh', fontFamily: "'Consolas', 'Monaco', monospace", background: '#111827', color: '#f3f4f6', fontSize: 13 }}>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div style={{ width: 240, borderRight: '1px solid #374151', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #374151' }}>
            <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>🛢 GTD DB</div>
            <div style={{ color: '#4b5563', fontSize: 11 }}>{tables.length} tables</div>
          </div>
          <div style={{ padding: '8px 12px' }}>
            <input
              value={sidebarFilter}
              onChange={e => setSidebarFilter(e.target.value)}
              placeholder="Filter tables…"
              style={{ width: '100%', padding: '5px 8px', background: '#1f2937', border: '1px solid #374151', borderRadius: 4, color: '#f3f4f6', fontFamily: 'inherit', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredTables.map(t => (
              <button
                key={`${t.schema}.${t.name}`}
                onClick={() => selectTable(t)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '6px 14px',
                  background: selected?.name === t.name && selected?.schema === t.schema ? '#1e3a5f' : 'transparent',
                  border: 'none', cursor: 'pointer', color: selected?.name === t.name && selected?.schema === t.schema ? '#93c5fd' : '#d1d5db',
                  borderLeft: selected?.name === t.name && selected?.schema === t.schema ? '3px solid #3b82f6' : '3px solid transparent',
                }}
              >
                <span style={{ color: '#6b7280', fontSize: 11 }}>{t.schema}.</span>
                <span style={{ fontWeight: 600 }}>{t.name}</span>
                {t.rows !== null && (
                  <span style={{ float: 'right', color: '#6b7280', fontSize: 11 }}>{t.rows.toLocaleString()}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main panel ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Top bar */}
          <div style={{ borderBottom: '1px solid #374151', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
            {selected ? (
              <>
                <span style={{ color: '#60a5fa', fontWeight: 700 }}>{selected.schema}.{selected.name}</span>
                {selected.rows !== null && <span style={{ color: '#6b7280', fontSize: 12 }}>{selected.rows.toLocaleString()} rows</span>}
                <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
                  {(['structure', 'data', 'query'] as const).map(tab => (
                    <button key={tab} onClick={() => {
                      setActiveTab(tab);
                      if (tab === 'data' && !previewResult) loadPreview();
                      if (tab === 'query') setCustomSql(sqlPreview(selected.schema, selected.name, previewLimit));
                    }}
                      style={{ padding: '4px 12px', background: activeTab === tab ? '#2563eb' : '#1f2937', color: activeTab === tab ? '#fff' : '#9ca3af', border: '1px solid #374151', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
                      {tab}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <span style={{ color: '#6b7280' }}>← Select a table to explore</span>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {loading && <div style={{ color: '#9ca3af', padding: 20 }}>Running…</div>}

            {/* Structure tab */}
            {!loading && activeTab === 'structure' && selected && columns.length > 0 && (
              <div>
                <div style={{ marginBottom: 8, color: '#9ca3af', fontSize: 12 }}>{columns.length} columns</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#1f2937' }}>
                      {['column_name', 'data_type', 'is_nullable', 'column_default'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: '#9ca3af', borderBottom: '1px solid #374151', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((c, i) => (
                      <tr key={c.column_name} style={{ background: i % 2 === 0 ? 'transparent' : '#1a2232' }}>
                        <td style={{ padding: '5px 12px', color: '#93c5fd', fontWeight: 600, borderBottom: '1px solid #1f2937' }}>{c.column_name}</td>
                        <td style={{ padding: '5px 12px', color: '#a3e635', borderBottom: '1px solid #1f2937' }}>{c.data_type}</td>
                        <td style={{ padding: '5px 12px', color: c.is_nullable === 'YES' ? '#6b7280' : '#fb923c', borderBottom: '1px solid #1f2937' }}>{c.is_nullable}</td>
                        <td style={{ padding: '5px 12px', color: '#d1d5db', borderBottom: '1px solid #1f2937', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.column_default ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Data tab */}
            {!loading && activeTab === 'data' && selected && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ color: '#9ca3af', fontSize: 12 }}>Limit</span>
                  <select
                    value={previewLimit}
                    onChange={e => { setPreviewLimit(Number(e.target.value)); loadPreview(Number(e.target.value)); }}
                    style={{ padding: '3px 8px', background: '#1f2937', border: '1px solid #374151', borderRadius: 4, color: '#f3f4f6', fontFamily: 'inherit', fontSize: 12 }}
                  >
                    {[10, 50, 100, 250, 500].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <button onClick={() => loadPreview()}
                    style={{ padding: '4px 12px', background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
                    Refresh
                  </button>
                  {previewResult && <span style={{ color: '#6b7280', fontSize: 12 }}>{previewResult.rowCount} rows</span>}
                </div>
                {previewResult && previewResult.rows.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: '100%' }}>
                      <thead>
                        <tr style={{ background: '#1f2937' }}>
                          {previewResult.fields.map(f => (
                            <th key={f.name} style={{ textAlign: 'left', padding: '5px 10px', color: '#9ca3af', borderBottom: '1px solid #374151', whiteSpace: 'nowrap', fontWeight: 600 }}>{f.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewResult.rows.map((row, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#1a2232' }}>
                            {previewResult.fields.map(f => {
                              const val = row[f.name];
                              const str = val === null ? 'NULL' : typeof val === 'object' ? JSON.stringify(val) : String(val);
                              return (
                                <td key={f.name}
                                  title={str}
                                  style={{
                                    padding: '4px 10px', borderBottom: '1px solid #1f2937', whiteSpace: 'nowrap',
                                    maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis',
                                    color: val === null ? '#4b5563' : typeof val === 'number' ? '#a3e635' : typeof val === 'boolean' ? '#fb923c' : '#d1d5db',
                                  }}
                                >{str}</td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {previewResult && previewResult.rows.length === 0 && (
                  <div style={{ color: '#6b7280', fontSize: 12, padding: '12px 0' }}>No rows</div>
                )}
              </div>
            )}

            {/* Query tab */}
            {activeTab === 'query' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <textarea
                    ref={textareaRef}
                    value={customSql}
                    onChange={e => setCustomSql(e.target.value)}
                    onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCustom(); } }}
                    rows={6}
                    placeholder="SELECT * FROM payment_methods LIMIT 20;"
                    style={{ flex: 1, padding: '10px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#f3f4f6', fontFamily: 'inherit', fontSize: 13, resize: 'vertical', outline: 'none' }}
                  />
                  <button
                    onClick={runCustom}
                    disabled={loading}
                    style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    ▶ Run <span style={{ fontSize: 11, fontWeight: 400, color: '#93c5fd' }}>(Ctrl+Enter)</span>
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: -8 }}>Only SELECT / WITH queries are permitted.</div>
                {customError && (
                  <div style={{ padding: '8px 12px', background: '#7f1d1d', border: '1px solid #991b1b', borderRadius: 6, color: '#fca5a5', fontSize: 12, whiteSpace: 'pre-wrap' }}>{customError}</div>
                )}
                {!loading && customResult && customResult.rows.length > 0 && (
                  <div style={{ overflowX: 'auto', flex: 1 }}>
                    <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 6 }}>{customResult.rowCount} rows</div>
                    <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: '100%' }}>
                      <thead>
                        <tr style={{ background: '#1f2937' }}>
                          {customResult.fields.map(f => (
                            <th key={f.name} style={{ textAlign: 'left', padding: '5px 10px', color: '#9ca3af', borderBottom: '1px solid #374151', whiteSpace: 'nowrap', fontWeight: 600 }}>{f.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {customResult.rows.map((row, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#1a2232' }}>
                            {customResult.fields.map(f => {
                              const val = row[f.name];
                              const str = val === null ? 'NULL' : typeof val === 'object' ? JSON.stringify(val) : String(val);
                              return (
                                <td key={f.name}
                                  title={str}
                                  style={{
                                    padding: '4px 10px', borderBottom: '1px solid #1f2937', whiteSpace: 'nowrap',
                                    maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis',
                                    color: val === null ? '#4b5563' : typeof val === 'number' ? '#a3e635' : typeof val === 'boolean' ? '#fb923c' : '#d1d5db',
                                  }}
                                >{str}</td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {!loading && customResult && customResult.rows.length === 0 && (
                  <div style={{ color: '#6b7280', fontSize: 12 }}>No rows returned.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

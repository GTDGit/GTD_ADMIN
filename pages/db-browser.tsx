/**
 * DB Browser — temporary development tool.
 * Features: table list with row counts, structure view, paginated data
 * with inline cell editing (double-click), and a free SQL query tab.
 * DELETE this page + pages/api/db-browser/ when development is done.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TableInfo  { schema: string; name: string; rows: number | null; }
interface ColInfo    { column_name: string; data_type: string; is_nullable: string; column_default: string | null; }
interface Field      { name: string; dataTypeID: number; }
interface QResult    { rows: Record<string, unknown>[]; fields: Field[]; rowCount: number; }
interface EditState  { rowIdx: number; col: string; value: string; }

// ─── SQL helpers ─────────────────────────────────────────────────────────────
const SQL_TABLES = `SELECT table_schema AS schema, table_name AS name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_type='BASE TABLE' ORDER BY 1,2`;
const sqlCols    = (s: string, t: string) => `SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='${s}' AND table_name='${t}' ORDER BY ordinal_position`;
const sqlCount   = (s: string, t: string) => `SELECT COUNT(*) AS cnt FROM "${s}"."${t}"`;
const sqlPage    = (s: string, t: string, lim: number, off: number, orderCol: string) =>
  `SELECT * FROM "${s}"."${t}" ORDER BY "${orderCol}" LIMIT ${lim} OFFSET ${off}`;

// ─── Colour helpers ───────────────────────────────────────────────────────────
const cellColor = (v: unknown): string => {
  if (v === null)              return '#4b5563';
  if (typeof v === 'number')   return '#a3e635';
  if (typeof v === 'boolean')  return '#fb923c';
  return '#d1d5db';
};
const fmtVal = (v: unknown): string =>
  v === null ? 'NULL' : typeof v === 'object' ? JSON.stringify(v) : String(v);

// ─── Style constants ──────────────────────────────────────────────────────────
const BG   = '#111827';
const BG2  = '#1f2937';
const BG3  = '#1a2232';
const BORD = '#374151';
const BLUE = '#2563eb';
const MONO = "'Consolas','Monaco',monospace";

export default function DbBrowser() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [authErr, setAuthErr]   = useState('');

  const [tables, setTables]     = useState<TableInfo[]>([]);
  const [sel, setSel]           = useState<TableInfo | null>(null);
  const [cols, setCols]         = useState<ColInfo[]>([]);

  // pagination
  const [limit, setLimit]       = useState(50);
  const [page, setPage]         = useState(0);       // 0-based
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [pageResult, setPageResult] = useState<QResult | null>(null);

  // inline edit
  const [editing, setEditing]   = useState<EditState | null>(null);
  const [saveMsg, setSaveMsg]   = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  // query tab
  const [customSql, setCustomSql]   = useState('');
  const [customResult, setCustomResult] = useState<QResult | null>(null);
  const [customErr, setCustomErr]   = useState('');

  const [loading, setLoading]   = useState(false);
  const [filter, setFilter]     = useState('');
  const [tab, setTab]           = useState<'structure'|'data'|'query'>('structure');

  // first PK-like column for update identity
  const pkCol = cols[0]?.column_name ?? 'id';

  // ─── API helper ────────────────────────────────────────────────────────────
  const call = useCallback(async (body: object): Promise<QResult> => {
    const r = await fetch('/api/db-browser/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-db-pass': password },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error ?? 'Error');
    return { rows: d.rows ?? [], fields: d.fields ?? [], rowCount: d.rowCount ?? 0 };
  }, [password]);

  // ─── Auth ──────────────────────────────────────────────────────────────────
  const handleAuth = async () => {
    setAuthErr('');
    try { await call({ action: 'query', sql: 'SELECT 1' }); setAuthed(true); }
    catch { setAuthErr('Wrong password or DB connection error.'); }
  };

  // ─── Load table list ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    call({ action: 'query', sql: SQL_TABLES }).then(async r => {
      const list: TableInfo[] = r.rows.map(row => ({ schema: String(row.schema), name: String(row.name), rows: null }));
      const withCounts = await Promise.all(list.map(async t => {
        try {
          const c = await call({ action: 'query', sql: sqlCount(t.schema, t.name) });
          return { ...t, rows: Number((c.rows[0] as Record<string,unknown>)?.cnt ?? 0) };
        } catch { return t; }
      }));
      setTables(withCounts);
    }).catch(() => {});
  }, [authed, call]);

  // ─── Select table ──────────────────────────────────────────────────────────
  const selectTable = async (t: TableInfo) => {
    setSel(t); setTab('structure'); setPage(0); setPageResult(null); setCols([]);
    setEditing(null); setSaveMsg('');
    setLoading(true);
    try {
      const r = await call({ action: 'query', sql: sqlCols(t.schema, t.name) });
      setCols(r.rows as unknown as ColInfo[]);
      setTotalRows(t.rows);
    } catch { setCols([]); }
    setLoading(false);
  };

  // ─── Load page ─────────────────────────────────────────────────────────────
  const loadPage = useCallback(async (t: TableInfo, p: number, lim: number, orderC: string) => {
    setLoading(true);
    setPageResult(null);
    setEditing(null);
    setSaveMsg('');
    try {
      const r = await call({ action: 'query', sql: sqlPage(t.schema, t.name, lim, p * lim, orderC) });
      setPageResult(r);
    } catch (e) { setCustomErr(String(e)); }
    setLoading(false);
  }, [call]);

  useEffect(() => {
    if (tab === 'data' && sel && pkCol) loadPage(sel, page, limit, pkCol);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, limit, sel]);

  // ─── Inline edit ───────────────────────────────────────────────────────────
  const startEdit = (rowIdx: number, col: string, currentVal: unknown) => {
    if (!sel) return;
    setEditing({ rowIdx, col, value: currentVal === null ? 'NULL' : fmtVal(currentVal) });
    setTimeout(() => editRef.current?.focus(), 50);
  };

  const commitEdit = async () => {
    if (!editing || !sel || !pageResult) return;
    const pkVal = pageResult.rows[editing.rowIdx][pkCol];
    try {
      await call({ action: 'update', schema: sel.schema, table: sel.name, pkCol, pkVal, col: editing.col, val: editing.value });
      // optimistically update local data
      const newRows = pageResult.rows.map((row, i) =>
        i === editing.rowIdx ? { ...row, [editing.col]: editing.value === 'NULL' ? null : editing.value } : row
      );
      setPageResult({ ...pageResult, rows: newRows });
      setSaveMsg(`✓ Saved "${editing.col}"`);
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (e) {
      setSaveMsg(`✗ ${e}`);
    }
    setEditing(null);
  };

  const cancelEdit = () => setEditing(null);

  // ─── Custom query ──────────────────────────────────────────────────────────
  const runCustom = async () => {
    if (!customSql.trim()) return;
    setLoading(true); setCustomErr(''); setCustomResult(null);
    try { setCustomResult(await call({ action: 'query', sql: customSql })); }
    catch (e) { setCustomErr(String(e)); }
    setLoading(false);
  };

  const filtered = tables.filter(t => `${t.schema}.${t.name}`.toLowerCase().includes(filter.toLowerCase()));
  const totalPages = totalRows !== null ? Math.ceil(totalRows / limit) : null;

  // ─── Auth screen ─────────────────────────────────────────────────────────
  if (!authed) return (
    <>
      <Head><title>DB Browser — GTD Admin</title></Head>
      <div style={{ minHeight:'100vh', background:BG, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:MONO }}>
        <div style={{ background:BG2, border:`1px solid ${BORD}`, borderRadius:8, padding:'2rem', width:360 }}>
          <div style={{ color:'#60a5fa', fontSize:18, fontWeight:700, marginBottom:4 }}>🛢 DB Browser</div>
          <div style={{ color:'#6b7280', fontSize:12, marginBottom:24 }}>Temporary dev tool — GTD Postgres</div>
          <label style={{ color:'#9ca3af', fontSize:13 }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleAuth()}
            style={{ display:'block', width:'100%', marginTop:6, marginBottom:16, padding:'8px 12px', background:'#111827', border:`1px solid ${BORD}`, borderRadius:6, color:'#f3f4f6', fontFamily:MONO, fontSize:14, boxSizing:'border-box' }}
            placeholder="Enter DB_BROWSER_PASSWORD" autoFocus />
          {authErr && <div style={{ color:'#f87171', fontSize:12, marginBottom:12 }}>{authErr}</div>}
          <button onClick={handleAuth}
            style={{ width:'100%', padding:'8px 0', background:BLUE, color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontFamily:MONO, fontSize:14, fontWeight:600 }}>
            Connect
          </button>
        </div>
      </div>
    </>
  );

  // ─── Main layout ─────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>DB Browser — GTD Admin</title></Head>
      <div style={{ display:'flex', height:'100vh', fontFamily:MONO, background:BG, color:'#f3f4f6', fontSize:13 }}>

        {/* Sidebar */}
        <div style={{ width:230, borderRight:`1px solid ${BORD}`, display:'flex', flexDirection:'column', flexShrink:0 }}>
          <div style={{ padding:'12px 12px 8px', borderBottom:`1px solid ${BORD}` }}>
            <div style={{ color:'#60a5fa', fontWeight:700, fontSize:14 }}>🛢 GTD DB</div>
            <div style={{ color:'#4b5563', fontSize:11 }}>{tables.length} tables</div>
          </div>
          <div style={{ padding:'8px 10px' }}>
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter tables…"
              style={{ width:'100%', padding:'5px 8px', background:BG2, border:`1px solid ${BORD}`, borderRadius:4, color:'#f3f4f6', fontFamily:MONO, fontSize:12, boxSizing:'border-box' }} />
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {filtered.map(t => {
              const active = sel?.name===t.name && sel?.schema===t.schema;
              return (
                <button key={`${t.schema}.${t.name}`} onClick={() => selectTable(t)}
                  style={{ display:'block', width:'100%', textAlign:'left', padding:'6px 12px', background:active?'#1e3a5f':'transparent', border:'none', cursor:'pointer', color:active?'#93c5fd':'#d1d5db', borderLeft:active?`3px solid ${BLUE}`:'3px solid transparent' }}>
                  <span style={{ color:'#6b7280', fontSize:11 }}>{t.schema}.</span>
                  <span style={{ fontWeight:600 }}>{t.name}</span>
                  {t.rows!==null && <span style={{ float:'right', color:'#6b7280', fontSize:11 }}>{t.rows.toLocaleString()}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main panel */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Top bar */}
          <div style={{ borderBottom:`1px solid ${BORD}`, padding:'8px 14px', display:'flex', alignItems:'center', gap:12, minHeight:40 }}>
            {sel ? (
              <>
                <span style={{ color:'#60a5fa', fontWeight:700 }}>{sel.schema}.{sel.name}</span>
                {totalRows!==null && <span style={{ color:'#6b7280', fontSize:12 }}>{totalRows.toLocaleString()} rows</span>}
                {saveMsg && <span style={{ fontSize:12, color: saveMsg.startsWith('✓') ? '#4ade80' : '#f87171', marginLeft:8 }}>{saveMsg}</span>}
                <div style={{ display:'flex', gap:2, marginLeft:'auto' }}>
                  {(['structure','data','query'] as const).map(t2 => (
                    <button key={t2} onClick={() => { setTab(t2); if(t2==='data'&&!pageResult) loadPage(sel,0,limit,pkCol); if(t2==='query') setCustomSql(sqlPage(sel.schema,sel.name,limit,0,pkCol)); }}
                      style={{ padding:'4px 12px', background:tab===t2?BLUE:BG2, color:tab===t2?'#fff':'#9ca3af', border:`1px solid ${BORD}`, borderRadius:4, cursor:'pointer', fontFamily:MONO, fontSize:12 }}>
                      {t2}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <span style={{ color:'#6b7280' }}>← Select a table</span>
            )}
          </div>

          {/* Content */}
          <div style={{ flex:1, overflow:'auto', padding:14 }}>
            {loading && <div style={{ color:'#9ca3af', padding:20 }}>Loading…</div>}

            {/* ── Structure ─────────────────────────────────────────────────── */}
            {!loading && tab==='structure' && sel && cols.length>0 && (
              <div>
                <div style={{ marginBottom:8, color:'#9ca3af', fontSize:12 }}>{cols.length} columns · PK assumed: <span style={{ color:'#93c5fd' }}>{pkCol}</span> · Double-click cells in Data tab to edit</div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:BG2 }}>
                      {['column_name','data_type','is_nullable','column_default'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'6px 12px', color:'#9ca3af', borderBottom:`1px solid ${BORD}`, fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cols.map((c,i) => (
                      <tr key={c.column_name} style={{ background: i%2===0?'transparent':BG3 }}>
                        <td style={{ padding:'5px 12px', color:'#93c5fd', fontWeight:600, borderBottom:`1px solid ${BG2}` }}>{c.column_name}</td>
                        <td style={{ padding:'5px 12px', color:'#a3e635', borderBottom:`1px solid ${BG2}` }}>{c.data_type}</td>
                        <td style={{ padding:'5px 12px', color:c.is_nullable==='YES'?'#6b7280':'#fb923c', borderBottom:`1px solid ${BG2}` }}>{c.is_nullable}</td>
                        <td style={{ padding:'5px 12px', color:'#d1d5db', borderBottom:`1px solid ${BG2}`, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.column_default??'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Data ─────────────────────────────────────────────────────── */}
            {!loading && tab==='data' && sel && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {/* Controls */}
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span style={{ color:'#9ca3af', fontSize:12 }}>Rows/page</span>
                  <select value={limit} onChange={e => { setPage(0); setLimit(Number(e.target.value)); }}
                    style={{ padding:'3px 8px', background:BG2, border:`1px solid ${BORD}`, borderRadius:4, color:'#f3f4f6', fontFamily:MONO, fontSize:12 }}>
                    {[10,25,50,100,250,500].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <button onClick={() => { setPage(0); loadPage(sel, 0, limit, pkCol); }}
                    style={{ padding:'3px 10px', background:BG2, color:'#9ca3af', border:`1px solid ${BORD}`, borderRadius:4, cursor:'pointer', fontFamily:MONO, fontSize:12 }}>↺ Refresh</button>
                  {/* Pagination */}
                  <div style={{ display:'flex', alignItems:'center', gap:4, marginLeft:'auto' }}>
                    <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0}
                      style={{ padding:'3px 10px', background:BG2, color:page===0?'#4b5563':'#9ca3af', border:`1px solid ${BORD}`, borderRadius:4, cursor:page===0?'default':'pointer', fontFamily:MONO, fontSize:12 }}>‹ Prev</button>
                    <span style={{ color:'#6b7280', fontSize:12, minWidth:90, textAlign:'center' }}>
                      Page {page+1}{totalPages!==null?` / ${totalPages}`:''}
                    </span>
                    <button onClick={() => setPage(p => p+1)} disabled={totalPages!==null && page>=totalPages-1}
                      style={{ padding:'3px 10px', background:BG2, color:(totalPages!==null&&page>=totalPages-1)?'#4b5563':'#9ca3af', border:`1px solid ${BORD}`, borderRadius:4, cursor:(totalPages!==null&&page>=totalPages-1)?'default':'pointer', fontFamily:MONO, fontSize:12 }}>Next ›</button>
                    {pageResult && <span style={{ color:'#4b5563', fontSize:11, marginLeft:6 }}>{pageResult.rowCount} rows</span>}
                  </div>
                </div>

                {/* Hint */}
                <div style={{ color:'#4b5563', fontSize:11 }}>Double-click any cell to edit · Enter to save · Esc to cancel · Set value to NULL (text) to store NULL</div>

                {/* Table */}
                {pageResult && pageResult.rows.length>0 && (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ borderCollapse:'collapse', fontSize:12, minWidth:'100%' }}>
                      <thead>
                        <tr style={{ background:BG2 }}>
                          {pageResult.fields.map(f => (
                            <th key={f.name} style={{ textAlign:'left', padding:'5px 10px', color:'#9ca3af', borderBottom:`1px solid ${BORD}`, whiteSpace:'nowrap', fontWeight:600, userSelect:'none' }}>{f.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageResult.rows.map((row, ri) => (
                          <tr key={ri} style={{ background: ri%2===0?'transparent':BG3 }}>
                            {pageResult.fields.map(f => {
                              const val = row[f.name];
                              const isEditing = editing?.rowIdx===ri && editing?.col===f.name;
                              return (
                                <td key={f.name}
                                  onDoubleClick={() => startEdit(ri, f.name, val)}
                                  title={fmtVal(val)}
                                  style={{ padding:'3px 10px', borderBottom:`1px solid ${BG2}`, whiteSpace:'nowrap', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', cursor:'cell', color: cellColor(val) }}>
                                  {isEditing ? (
                                    <input ref={editRef}
                                      value={editing.value}
                                      onChange={e => setEditing({ ...editing, value: e.target.value })}
                                      onKeyDown={e => { if(e.key==='Enter') commitEdit(); if(e.key==='Escape') cancelEdit(); }}
                                      onBlur={commitEdit}
                                      style={{ width:'100%', minWidth:80, padding:'1px 4px', background:'#0f172a', border:`1px solid ${BLUE}`, borderRadius:3, color:'#f3f4f6', fontFamily:MONO, fontSize:12, outline:'none', boxSizing:'border-box' }}
                                    />
                                  ) : fmtVal(val)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {pageResult && pageResult.rows.length===0 && <div style={{ color:'#6b7280', fontSize:12 }}>No rows on this page.</div>}
              </div>
            )}

            {/* ── Query ────────────────────────────────────────────────────── */}
            {tab==='query' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                  <textarea value={customSql} onChange={e => setCustomSql(e.target.value)}
                    onKeyDown={e => { if((e.ctrlKey||e.metaKey)&&e.key==='Enter') { e.preventDefault(); runCustom(); } }}
                    rows={6} placeholder="SELECT * FROM payment_methods LIMIT 20;"
                    style={{ flex:1, padding:'10px 12px', background:BG2, border:`1px solid ${BORD}`, borderRadius:6, color:'#f3f4f6', fontFamily:MONO, fontSize:13, resize:'vertical', outline:'none' }} />
                  <button onClick={runCustom} disabled={loading}
                    style={{ padding:'8px 16px', background:BLUE, color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontFamily:MONO, fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}>
                    ▶ Run <span style={{ fontSize:11, fontWeight:400, color:'#93c5fd' }}>(Ctrl+↵)</span>
                  </button>
                </div>
                <div style={{ fontSize:11, color:'#6b7280', marginTop:-6 }}>Only SELECT/WITH queries. UPDATE via double-click in Data tab.</div>
                {customErr && <div style={{ padding:'8px 12px', background:'#7f1d1d', border:'1px solid #991b1b', borderRadius:6, color:'#fca5a5', fontSize:12, whiteSpace:'pre-wrap' }}>{customErr}</div>}
                {!loading && customResult && customResult.rows.length>0 && (
                  <div style={{ overflowX:'auto' }}>
                    <div style={{ color:'#9ca3af', fontSize:12, marginBottom:6 }}>{customResult.rowCount} rows</div>
                    <table style={{ borderCollapse:'collapse', fontSize:12, minWidth:'100%' }}>
                      <thead>
                        <tr style={{ background:BG2 }}>
                          {customResult.fields.map(f => (
                            <th key={f.name} style={{ textAlign:'left', padding:'5px 10px', color:'#9ca3af', borderBottom:`1px solid ${BORD}`, whiteSpace:'nowrap', fontWeight:600 }}>{f.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {customResult.rows.map((row,i) => (
                          <tr key={i} style={{ background: i%2===0?'transparent':BG3 }}>
                            {customResult.fields.map(f => {
                              const val = row[f.name];
                              return (
                                <td key={f.name} title={fmtVal(val)}
                                  style={{ padding:'4px 10px', borderBottom:`1px solid ${BG2}`, whiteSpace:'nowrap', maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', color: cellColor(val) }}>
                                  {fmtVal(val)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {!loading && customResult && customResult.rows.length===0 && <div style={{ color:'#6b7280', fontSize:12 }}>No rows returned.</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

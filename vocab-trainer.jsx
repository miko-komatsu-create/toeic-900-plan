import { useState, useEffect, useCallback } from "react";

// ─── Storage ─────────────────────────────────────────────────────────────────
const KEY = "vocab-words-v1";

async function loadWords() {
  try {
    const r = await window.storage.get(KEY);
    return r ? JSON.parse(r.value) : [];
  } catch { return []; }
}

async function saveWords(words) {
  try { await window.storage.set(KEY, JSON.stringify(words)); } catch {}
}

// ─── Spaced Repetition ───────────────────────────────────────────────────────
function score(w) {
  const days = w.last_tested
    ? (Date.now() - new Date(w.last_tested)) / 86400000
    : 999;
  const missRate = w.test_count > 0 ? w.miss_count / w.test_count : 0;
  return (5 / (w.test_count + 1)) + missRate * 4 + Math.min(days / 7, 3) + Math.random() * 0.6;
}

function pick(words, n) {
  return [...words].map(w => ({ ...w, _s: score(w) }))
    .sort((a, b) => b._s - a._s)
    .slice(0, Math.min(n, words.length));
}

// ─── TSV Parser ──────────────────────────────────────────────────────────────
function parseTSV(raw) {
  return raw.trim().split("\n").filter(l => l.trim()).flatMap(line => {
    // Skip header lines
    if (line.startsWith("単語") || line.startsWith("word")) return [];
    const c = line.split("\t");
    if (c.length < 2 || !c[0].trim()) return [];
    return [{
      id: Math.random().toString(36).slice(2) + Date.now(),
      word: c[0]?.trim() ?? "",
      meaning_h: c[1]?.trim() ?? "",
      etymology: c[2]?.trim() ?? "",
      hint: c[3]?.trim() ?? "",
      meaning_c: c[4]?.trim() || c[1]?.trim() || "",
      test_count: parseInt(c[5]) || 0,
      miss_count: parseInt(c[6]) || 0,
      last_tested: c[7]?.trim() ?? "",
    }];
  });
}

function toTSV(words) {
  const H = "単語\t意味（隠し用）\t語源と関連語\t覚え方のヒント\t意味（確認用）\tテスト回数\tミス回数\t最終テスト日";
  const rows = words.map(w =>
    [w.word, w.meaning_h, w.etymology, w.hint, w.meaning_c, w.test_count, w.miss_count, w.last_tested].join("\t")
  );
  return [H, ...rows].join("\n");
}

// ─── Theme ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0f0e0b",
  surf: "#1a1813",
  card: "#222018",
  bdr: "#332f24",
  acc: "#c8912a",
  accL: "#ddb358",
  text: "#ede5ce",
  muted: "#6e6248",
  dim: "#3d3828",
  ok: "#4d9468",
  err: "#b04a42",
};

const btn = (col = C.acc, textCol = "#0f0e0b") => ({
  padding: "9px 22px", background: col, color: textCol,
  border: "none", borderRadius: 7, cursor: "pointer",
  fontWeight: 800, fontSize: 13, fontFamily: "inherit",
  transition: "opacity .15s",
});

// ─── ADD TAB ─────────────────────────────────────────────────────────────────
function AddTab({ words, onUpdate }) {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("");

  const handlePreview = () => {
    const parsed = parseTSV(raw);
    const existing = new Set(words.map(w => w.word.toLowerCase().trim()));
    const fresh = parsed.filter(p => !existing.has(p.word.toLowerCase().trim()));
    setPreview({ all: parsed, fresh });
    setStatus("");
  };

  const handleAdd = async () => {
    if (!preview?.fresh.length) return;
    await onUpdate([...words, ...preview.fresh]);
    setRaw(""); setPreview(null);
    setStatus(`✓ ${preview.fresh.length}件を追加しました`);
  };

  return (
    <div>
      <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.7, marginBottom: 14 }}>
        ClaudeにTSV形式で出力してもらったデータをここに貼り付けます。<br />
        既に登録済みの単語は自動で除外されます。
      </p>
      <textarea
        value={raw}
        onChange={e => { setRaw(e.target.value); setPreview(null); setStatus(""); }}
        placeholder={"（ClaudeのTSV出力をここに貼り付け）\n例: abandon\t捨てる\ta-(強意)+bandon...\t「アバンダン！」と叫んで...\t[vt.] 捨てる、放棄する\t0\t0\t"}
        style={{
          width: "100%", minHeight: 140, background: C.surf, border: `1px solid ${C.bdr}`,
          borderRadius: 8, color: C.text, padding: "10px 12px", fontSize: 11.5,
          fontFamily: "'Courier New', monospace", resize: "vertical",
          boxSizing: "border-box", outline: "none", lineHeight: 1.5,
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={handlePreview} disabled={!raw.trim()} style={btn(C.bdr, C.accL)}>
          プレビュー
        </button>
        {preview?.fresh.length > 0 && (
          <button onClick={handleAdd} style={btn(C.ok, "#fff")}>
            {preview.fresh.length}件を追加する
          </button>
        )}
      </div>

      {preview && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
            解析 <span style={{ color: C.text }}>{preview.all.length}</span>件 ／
            新規 <span style={{ color: C.accL }}> {preview.fresh.length}</span>件 ／
            重複スキップ <span style={{ color: C.muted }}> {preview.all.length - preview.fresh.length}</span>件
          </p>
          <div style={{ border: `1px solid ${C.bdr}`, borderRadius: 7, maxHeight: 200, overflowY: "auto" }}>
            {preview.fresh.map((w, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                padding: "6px 12px", borderBottom: `1px solid ${C.bdr}`, gap: 8,
              }}>
                <span style={{ color: C.accL, fontWeight: 700, fontSize: 13 }}>{w.word}</span>
                <span style={{ color: C.muted, fontSize: 12 }}>{w.meaning_h}</span>
              </div>
            ))}
            {preview.fresh.length === 0 && (
              <p style={{ color: C.muted, padding: 12, fontSize: 12, textAlign: "center" }}>
                新しい単語はありません（すべて登録済み）
              </p>
            )}
          </div>
        </div>
      )}

      {status && <p style={{ color: C.ok, marginTop: 10, fontSize: 13 }}>{status}</p>}

      <div style={{
        marginTop: 20, padding: "12px 14px", background: C.surf,
        border: `1px solid ${C.bdr}`, borderRadius: 8,
      }}>
        <p style={{ color: C.muted, fontSize: 11.5, lineHeight: 1.7, margin: 0 }}>
          <span style={{ color: C.accL }}>💡 Claudeへの送り方：</span><br />
          英単語を羅列して送るだけでTSVを生成してくれます。<br />
          例：「<span style={{ color: C.text }}>abandon, suppress, expedite, meander</span>」と送る<br />
          → Claudeが8カラムのTSVを出力 → ここに貼り付ける
        </p>
      </div>
    </div>
  );
}

// ─── TEST TAB ────────────────────────────────────────────────────────────────
function TestTab({ words, onUpdate }) {
  const [phase, setPhase] = useState("config");
  const [count, setCount] = useState(7);
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState([]);
  const [showEtym, setShowEtym] = useState(false);

  const start = () => {
    setQueue(pick(words, count));
    setIdx(0); setFlipped(false); setResults([]); setShowEtym(false);
    setPhase("quiz");
  };

  const answer = async (correct) => {
    const w = queue[idx];
    const today = new Date().toISOString().slice(0, 10);
    const updated = {
      ...w, test_count: w.test_count + 1,
      miss_count: w.miss_count + (correct ? 0 : 1),
      last_tested: today,
    };
    const newResults = [...results, { word: updated, correct }];
    setResults(newResults);
    await onUpdate(words.map(x => x.id === w.id ? updated : x));
    if (idx + 1 >= queue.length) { setPhase("result"); }
    else { setIdx(i => i + 1); setFlipped(false); setShowEtym(false); }
  };

  if (words.length === 0) return (
    <div style={{ textAlign: "center", color: C.muted, paddingTop: 50 }}>
      <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
      <p style={{ fontSize: 13 }}>単語が登録されていません。<br />「単語追加」タブから始めましょう。</p>
    </div>
  );

  if (phase === "config") {
    const untested = words.filter(w => w.test_count === 0).length;
    const struggling = words.filter(w => w.test_count > 0 && w.miss_count / w.test_count > 0.5).length;
    return (
      <div>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10, marginBottom: 24,
        }}>
          {[
            { label: "総単語数", val: words.length, col: C.text },
            { label: "未テスト", val: untested, col: C.accL },
            { label: "苦手単語", val: struggling, col: C.err },
          ].map(({ label, val, col }) => (
            <div key={label} style={{
              background: C.surf, border: `1px solid ${C.bdr}`,
              borderRadius: 8, padding: "12px 10px", textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: col }}>{val}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <p style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>出題数を選択</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[5, 7, 10, 15].map(n => (
            <button key={n} onClick={() => setCount(n)} style={{
              padding: "7px 16px", borderRadius: 6,
              border: `2px solid ${count === n ? C.acc : C.bdr}`,
              background: count === n ? C.acc + "22" : "transparent",
              color: count === n ? C.accL : C.muted,
              cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "inherit",
            }}>{n}</button>
          ))}
        </div>

        <button onClick={start} style={btn()}>テスト開始</button>
        <p style={{ color: C.dim, fontSize: 11, marginTop: 10, lineHeight: 1.6 }}>
          未テスト・ミスが多い・最終テストから時間が経った単語を優先して出題します
        </p>
      </div>
    );
  }

  if (phase === "quiz") {
    const w = queue[idx];
    const missRate = w.test_count > 0 ? Math.round(w.miss_count / w.test_count * 100) : null;

    return (
      <div>
        {/* Progress bar */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: C.muted, fontSize: 12 }}>{idx + 1} / {queue.length}</span>
          {missRate !== null && (
            <span style={{ color: missRate > 50 ? C.err : C.muted, fontSize: 11 }}>
              過去ミス率 {missRate}%
            </span>
          )}
        </div>
        <div style={{ height: 3, background: C.bdr, borderRadius: 2, marginBottom: 24 }}>
          <div style={{
            height: "100%", width: `${(idx / queue.length) * 100}%`,
            background: C.acc, borderRadius: 2, transition: "width .3s",
          }} />
        </div>

        {/* Card */}
        <div style={{
          background: C.card, border: `1px solid ${C.bdr}`,
          borderRadius: 12, padding: "28px 22px", marginBottom: 14, minHeight: 180,
        }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: C.text, letterSpacing: "0.02em", marginBottom: 6 }}>
            {w.word}
          </div>
          {w.test_count > 0 && (
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 12 }}>
              テスト {w.test_count}回 ／ ミス {w.miss_count}回
            </div>
          )}

          {!flipped ? (
            <button onClick={() => setFlipped(true)} style={{
              marginTop: 8, padding: "8px 22px",
              background: "transparent", border: `1px solid ${C.bdr}`,
              borderRadius: 6, color: C.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
            }}>答えを見る</button>
          ) : (
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.accL, marginBottom: 12 }}>
                {w.meaning_c}
              </div>
              {w.hint && (
                <div style={{
                  background: C.surf, borderRadius: 6, padding: "8px 12px", marginBottom: 8,
                  fontSize: 12, color: C.muted, lineHeight: 1.6,
                }}>
                  💡 {w.hint}
                </div>
              )}
              {w.etymology && (
                <button onClick={() => setShowEtym(!showEtym)} style={{
                  background: "transparent", border: "none", color: C.dim,
                  fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "inherit",
                }}>
                  {showEtym ? "▲" : "▶"} 語源を{showEtym ? "隠す" : "見る"}
                </button>
              )}
              {showEtym && w.etymology && (
                <div style={{ color: C.muted, fontSize: 11, marginTop: 6, lineHeight: 1.6 }}>
                  🔍 {w.etymology}
                </div>
              )}
            </div>
          )}
        </div>

        {flipped && (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => answer(true)} style={{
              flex: 1, padding: 12, background: C.ok + "22",
              border: `2px solid ${C.ok}`, borderRadius: 8,
              color: C.ok, cursor: "pointer", fontWeight: 900, fontSize: 16, fontFamily: "inherit",
            }}>✓ 正解</button>
            <button onClick={() => answer(false)} style={{
              flex: 1, padding: 12, background: C.err + "22",
              border: `2px solid ${C.err}`, borderRadius: 8,
              color: C.err, cursor: "pointer", fontWeight: 900, fontSize: 16, fontFamily: "inherit",
            }}>✗ ミス</button>
          </div>
        )}
      </div>
    );
  }

  if (phase === "result") {
    const correct = results.filter(r => r.correct).length;
    const pct = Math.round(correct / results.length * 100);
    return (
      <div>
        <div style={{ textAlign: "center", marginBottom: 24, padding: "20px 0" }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: pct >= 80 ? C.ok : pct >= 60 ? C.accL : C.err }}>
            {pct}%
          </div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            {correct} / {results.length} 正解
          </div>
        </div>
        <div style={{ border: `1px solid ${C.bdr}`, borderRadius: 8, maxHeight: 240, overflowY: "auto", marginBottom: 14 }}>
          {results.map((r, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "24px 1fr 1fr",
              alignItems: "center", gap: 10,
              padding: "7px 12px", borderBottom: `1px solid ${C.bdr}`,
            }}>
              <span style={{ fontSize: 16 }}>{r.correct ? "✓" : "✗"}</span>
              <span style={{ color: r.correct ? C.text : C.err, fontWeight: 700, fontSize: 13 }}>{r.word.word}</span>
              <span style={{ color: C.muted, fontSize: 12 }}>{r.word.meaning_h}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setPhase("config")} style={btn()}>もう一度</button>
          <button onClick={() => { setResults([]); start(); }} style={btn(C.surf, C.accL)}>
            続けてテスト
          </button>
        </div>
      </div>
    );
  }
}

// ─── LIST TAB ────────────────────────────────────────────────────────────────
function ListTab({ words, onUpdate }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("added");
  const [confirmDel, setConfirmDel] = useState(null);
  const [delAll, setDelAll] = useState(false);

  const sorted = [...words]
    .filter(w =>
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.meaning_h.includes(search)
    )
    .sort((a, b) => {
      if (sort === "miss") return (b.miss_count / Math.max(b.test_count, 1)) - (a.miss_count / Math.max(a.test_count, 1));
      if (sort === "untested") return a.test_count - b.test_count;
      return 0;
    });

  const del = async (id) => {
    if (confirmDel === id) {
      await onUpdate(words.filter(w => w.id !== id));
      setConfirmDel(null);
    } else {
      setConfirmDel(id);
      setTimeout(() => setConfirmDel(c => c === id ? null : c), 3000);
    }
  };

  const delAllFn = async () => {
    if (delAll) { await onUpdate([]); setDelAll(false); }
    else { setDelAll(true); setTimeout(() => setDelAll(false), 3000); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="単語・意味で検索..."
          style={{
            flex: 1, minWidth: 120, padding: "6px 10px",
            background: C.surf, border: `1px solid ${C.bdr}`,
            borderRadius: 6, color: C.text, fontSize: 12, outline: "none", fontFamily: "inherit",
          }}
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{
            padding: "6px 8px", background: C.surf, border: `1px solid ${C.bdr}`,
            borderRadius: 6, color: C.muted, fontSize: 12, outline: "none", fontFamily: "inherit",
          }}
        >
          <option value="added">追加順</option>
          <option value="miss">ミス率順</option>
          <option value="untested">未テスト優先</option>
        </select>
      </div>

      <div style={{ color: C.muted, fontSize: 11, marginBottom: 8 }}>
        {sorted.length} / {words.length} 件表示
      </div>

      <div style={{ border: `1px solid ${C.bdr}`, borderRadius: 8, maxHeight: 300, overflowY: "auto" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 52px 52px 44px",
          padding: "5px 12px", borderBottom: `1px solid ${C.bdr}`,
          fontSize: 10, color: C.dim, fontWeight: 700,
        }}>
          <span>単語</span><span>意味</span>
          <span style={{ textAlign: "center" }}>回数</span>
          <span style={{ textAlign: "center" }}>ミス</span>
          <span />
        </div>
        {sorted.length === 0 ? (
          <p style={{ color: C.muted, textAlign: "center", padding: 20, fontSize: 13 }}>
            {search ? "見つかりませんでした" : "単語がありません"}
          </p>
        ) : sorted.map(w => {
          const missRate = w.test_count > 0 ? w.miss_count / w.test_count : 0;
          return (
            <div key={w.id} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 52px 52px 44px",
              padding: "6px 12px", borderBottom: `1px solid ${C.bdr}`,
              alignItems: "center", fontSize: 12,
            }}>
              <span style={{ color: C.accL, fontWeight: 700 }}>{w.word}</span>
              <span style={{ color: C.muted }}>{w.meaning_h}</span>
              <span style={{ color: C.muted, textAlign: "center" }}>{w.test_count}</span>
              <span style={{
                textAlign: "center",
                color: missRate > 0.5 ? C.err : missRate > 0.2 ? C.accL : C.muted,
              }}>{w.miss_count}</span>
              <button onClick={() => del(w.id)} style={{
                padding: "3px 6px",
                background: confirmDel === w.id ? C.err : "transparent",
                border: `1px solid ${confirmDel === w.id ? C.err : C.bdr}`,
                borderRadius: 4, color: confirmDel === w.id ? "#fff" : C.dim,
                cursor: "pointer", fontSize: 10, fontFamily: "inherit",
              }}>
                {confirmDel === w.id ? "確認" : "削除"}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={delAllFn} style={{
          padding: "5px 12px", background: delAll ? C.err : "transparent",
          border: `1px solid ${delAll ? C.err : C.bdr}`,
          borderRadius: 5, color: delAll ? "#fff" : C.dim,
          cursor: "pointer", fontSize: 11, fontFamily: "inherit",
        }}>
          {delAll ? "⚠ 本当に全削除しますか？" : "全削除"}
        </button>
      </div>
    </div>
  );
}

// ─── EXPORT TAB ──────────────────────────────────────────────────────────────
function ExportTab({ words }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toTSV(words));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const tsv = toTSV(words);

  return (
    <div>
      <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.7, marginBottom: 14 }}>
        全単語データをTSV形式でコピーします。<br />
        Googleスプレッドシートで「編集 → 貼り付け」するとそのまま入ります。<br />
        列A〜Hが8カラムに対応しています。
      </p>
      <button onClick={copy} disabled={words.length === 0} style={{
        ...btn(copied ? C.ok : C.acc, copied ? "#fff" : "#0f0e0b"),
        marginBottom: 16,
      }}>
        {copied ? "✓ コピーしました！" : `TSVをコピー（${words.length}件）`}
      </button>

      {words.length > 0 && (
        <>
          <p style={{ color: C.dim, fontSize: 11, marginBottom: 6 }}>プレビュー（先頭3件）</p>
          <div style={{
            background: C.surf, border: `1px solid ${C.bdr}`,
            borderRadius: 6, padding: "10px 12px", overflowX: "auto",
          }}>
            <pre style={{
              color: C.muted, fontSize: 10, margin: 0,
              whiteSpace: "pre", lineHeight: 1.6,
            }}>
              {tsv.split("\n").slice(0, 4).join("\n")}
              {words.length > 3 ? "\n..." : ""}
            </pre>
          </div>
        </>
      )}

      <div style={{
        marginTop: 16, padding: "12px 14px", background: C.surf,
        border: `1px solid ${C.bdr}`, borderRadius: 8,
      }}>
        <p style={{ color: C.muted, fontSize: 11.5, lineHeight: 1.7, margin: 0 }}>
          <span style={{ color: C.accL }}>📋 Googleスプレッドシートへの反映手順</span><br />
          1. 「TSVをコピー」ボタンを押す<br />
          2. スプレッドシートのセルA1をクリック<br />
          3. Ctrl+V（Mac: ⌘+V）で貼り付け<br />
          4. 「意味（隠し用）」列（B列）の文字色を白にして目隠し
        </p>
      </div>
    </div>
  );
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "add", label: "単語追加", icon: "＋" },
  { id: "test", label: "テスト", icon: "✎" },
  { id: "list", label: "一覧", icon: "≡" },
  { id: "export", label: "エクスポート", icon: "↑" },
];

export default function App() {
  const [tab, setTab] = useState("add");
  const [words, setWords] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadWords().then(w => { setWords(w); setReady(true); });
  }, []);

  const update = useCallback(async (nw) => {
    setWords(nw);
    await saveWords(nw);
  }, []);

  if (!ready) return (
    <div style={{
      background: C.bg, minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ color: C.muted, fontSize: 13 }}>Loading...</span>
    </div>
  );

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", color: C.text,
      fontFamily: "'Palatino Linotype', 'Book Antiqua', Georgia, serif",
      padding: "18px 16px 32px",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${C.bdr}` }}>
        <div style={{
          fontSize: 18, fontWeight: 900, color: C.accL, letterSpacing: "0.08em",
          textTransform: "uppercase", marginBottom: 3,
        }}>
          📚 Vocab Trainer
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          TOEIC 忘却曲線学習システム　|　{words.length} 単語登録済み
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.bdr}`, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "7px 14px", background: "transparent", border: "none",
            borderBottom: tab === t.id ? `2px solid ${C.acc}` : "2px solid transparent",
            marginBottom: -1, cursor: "pointer", fontFamily: "inherit",
            color: tab === t.id ? C.accL : C.muted,
            fontWeight: tab === t.id ? 800 : 400, fontSize: 12.5,
            transition: "color .15s",
          }}>
            <span style={{ marginRight: 4 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "add" && <AddTab words={words} onUpdate={update} />}
      {tab === "test" && <TestTab words={words} onUpdate={update} />}
      {tab === "list" && <ListTab words={words} onUpdate={update} />}
      {tab === "export" && <ExportTab words={words} />}
    </div>
  );
}

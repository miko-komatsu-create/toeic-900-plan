---
name: english-vocab-trainer
description: TOEIC英単語学習スキル。英単語を羅列して送ってきたとき（改行・カンマ・スペース区切りなど、明らかに単語リストとわかる入力）に必ずこのスキルを使う。「テストして」「テスト開始」と言われたら保存済み単語でフラッシュカードテストをshow_widgetで表示する。英語学習、TOEIC、単語帳に関わる場面では積極的にこのスキルを参照すること。
---

# TOEIC英単語学習アシスタント

## 単語リスト入力時の動作

ユーザーが英単語を羅列して送ってきたら、以下を行う：

### Step 1: チャットに解説を表示する

各単語について以下をチャットのテキストで表示する（show_widgetは使わない）：

```
**[単語]**
意味：[品詞付き完全な意味（例: [vt.] 抑圧する、鎮圧する）]
語源：[接頭辞・語根・接尾辞の分解 ＋ 同語根語2〜3個]
覚え方：[語呂合わせ・情景・ユーモアで印象に残るもの]
```

覚え方のポイント：
- 語呂合わせ：単語の音を日本語に当てはめる（例: "suppress" → 「スープレックスで押さえつける」）
- 情景・ストーリー：動きのある具体的な場面
- 既知単語との接続：知っている英単語・日本語と組み合わせる
- 誇張・ユーモア：大げさに記憶に引っかかりを作る

### Step 2: ストレージに保存する

解説を表示した後、show_widgetを使って以下のHTMLを表示し、単語データをストレージに保存する。

**保存用ウィジェットのHTML（show_widgetで表示）：**

```html
<div style="font-family:sans-serif;font-size:12px;color:#6e6248;padding:8px 12px;background:#1a1813;border:1px solid #332f24;border-radius:8px;display:inline-block;">
  ✓ {N}件をストレージに保存しました（合計 {TOTAL}件）
</div>
<script>
(async () => {
  const KEY = "vocab-words-v1";
  const newWords = {JSON_DATA};
  let existing = [];
  try { const r = await window.storage.get(KEY); existing = r ? JSON.parse(r.value) : []; } catch { existing = []; }
  const existingSet = new Set(existing.map(w => w.word.toLowerCase()));
  const fresh = newWords.filter(w => !existingSet.has(w.word.toLowerCase()));
  const merged = [...existing, ...fresh];
  try { await window.storage.set(KEY, JSON.stringify(merged)); } catch {}
})();
</script>
```

{JSON_DATA} には以下の構造のJSON配列を埋め込む：
```json
[
  {
    "id": "{ランダム文字列+timestamp}",
    "word": "単語",
    "meaning_h": "短い意味（隠し用）",
    "meaning_c": "[品詞] 完全な意味",
    "etymology": "語源と関連語",
    "hint": "覚え方",
    "test_count": 0,
    "miss_count": 0,
    "last_tested": ""
  }
]
```

{N} = 今回追加する件数、{TOTAL} = 既存＋今回の合計件数（概算でよい）

---

## テストモードの動作

「テストして」「テスト開始」と言われたら、`/mnt/skills/user/english-vocab-trainer/test.html` を読み込んでshow_widgetで表示する。

test.htmlが存在しない場合は以下のHTMLをshow_widgetで表示する：

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f0e0b; color: #ede5ce; font-family: 'Palatino Linotype', Georgia, serif; padding: 20px 16px 32px; min-height: 100vh; }
  .header-title { font-size: 16px; font-weight: 900; color: #ddb358; margin-bottom: 4px; }
  .header-sub { font-size: 11px; color: #6e6248; margin-bottom: 20px; }
  .config { margin-bottom: 20px; }
  .count-btns { display: flex; gap: 8px; margin: 10px 0 16px; }
  .count-btn { padding: 7px 16px; border-radius: 6px; border: 2px solid #332f24; background: transparent; color: #6e6248; cursor: pointer; font-weight: 800; font-size: 14px; font-family: inherit; }
  .count-btn.active { border-color: #c8912a; background: rgba(200,145,42,0.13); color: #ddb358; }
  .start-btn { padding: 10px 24px; background: #c8912a; color: #0f0e0b; border: none; border-radius: 7px; cursor: pointer; font-weight: 800; font-size: 14px; font-family: inherit; }
  .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .stat { background: #1a1813; border: 1px solid #332f24; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-n { font-size: 22px; font-weight: 900; }
  .stat-l { font-size: 11px; color: #6e6248; margin-top: 2px; }
  .progress-bar { height: 3px; background: #332f24; border-radius: 2px; margin-bottom: 20px; }
  .progress-fill { height: 100%; background: #c8912a; border-radius: 2px; transition: width .3s; }
  .card { background: #222018; border: 1px solid #332f24; border-radius: 12px; padding: 28px 22px; margin-bottom: 14px; min-height: 160px; }
  .card-word { font-size: 36px; font-weight: 900; color: #ede5ce; margin-bottom: 6px; }
  .card-meta { font-size: 11px; color: #3d3828; margin-bottom: 16px; }
  .card-meaning { font-size: 20px; font-weight: 800; color: #ddb358; margin-bottom: 12px; }
  .hint-box { background: #1a1813; border-radius: 6px; padding: 8px 12px; font-size: 12px; color: #6e6248; line-height: 1.6; margin-bottom: 8px; }
  .etym-btn { background: transparent; border: none; color: #3d3828; font-size: 11px; cursor: pointer; font-family: inherit; }
  .etym-text { font-size: 11px; color: #6e6248; margin-top: 6px; line-height: 1.6; }
  .reveal-btn { padding: 9px 24px; background: transparent; border: 1px solid #332f24; border-radius: 6px; color: #6e6248; cursor: pointer; font-size: 13px; font-family: inherit; }
  .answer-btns { display: flex; gap: 10px; }
  .ok-btn { flex: 1; padding: 13px; background: rgba(77,148,104,0.13); border: 2px solid #4d9468; border-radius: 8px; color: #4d9468; cursor: pointer; font-weight: 900; font-size: 18px; font-family: inherit; }
  .miss-btn { flex: 1; padding: 13px; background: rgba(176,74,66,0.13); border: 2px solid #b04a42; border-radius: 8px; color: #b04a42; cursor: pointer; font-weight: 900; font-size: 18px; font-family: inherit; }
  .result-pct { font-size: 48px; font-weight: 900; text-align: center; margin: 20px 0 4px; }
  .result-sub { color: #6e6248; font-size: 13px; text-align: center; margin-bottom: 20px; }
  .result-list { border: 1px solid #332f24; border-radius: 8px; max-height: 260px; overflow-y: auto; margin-bottom: 16px; }
  .result-item { display: grid; grid-template-columns: 20px 1fr 1fr; gap: 10px; align-items: center; padding: 7px 12px; border-bottom: 1px solid #332f24; font-size: 12px; }
  #screen-empty { color: #6e6248; text-align: center; padding: 40px 0; }
</style>
</head>
<body>

<div class="header-title">📖 Vocab Test</div>
<div class="header-sub" id="sub">読み込み中...</div>

<div id="screen-config" style="display:none;">
  <div class="stats" id="stats"></div>
  <p style="color:#6e6248;font-size:12px;margin-bottom:6px;">出題数</p>
  <div class="count-btns">
    <button class="count-btn" onclick="setN(5)">5</button>
    <button class="count-btn active" onclick="setN(7)">7</button>
    <button class="count-btn" onclick="setN(10)">10</button>
    <button class="count-btn" onclick="setN(15)">15</button>
  </div>
  <button class="start-btn" onclick="startTest()">テスト開始</button>
  <p style="color:#3d3828;font-size:11px;margin-top:10px;line-height:1.5;">未テスト・ミスが多い・時間が経った単語を優先出題</p>
</div>

<div id="screen-empty" style="display:none;">単語がまだ登録されていません。<br>単語を送って登録してください。</div>

<div id="screen-quiz" style="display:none;">
  <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
    <span style="color:#6e6248;font-size:12px;" id="q-counter"></span>
    <span style="font-size:11px;" id="q-missrate"></span>
  </div>
  <div class="progress-bar"><div class="progress-fill" id="q-progress"></div></div>
  <div class="card">
    <div class="card-word" id="q-word"></div>
    <div class="card-meta" id="q-meta"></div>
    <div id="q-hidden">
      <button class="reveal-btn" onclick="reveal()">答えを見る</button>
    </div>
    <div id="q-revealed" style="display:none;">
      <div class="card-meaning" id="q-meaning"></div>
      <div class="hint-box" id="q-hint" style="display:none;"></div>
      <button class="etym-btn" id="q-etym-btn" onclick="toggleEtym()" style="display:none;"></button>
      <div class="etym-text" id="q-etym" style="display:none;"></div>
    </div>
  </div>
  <div class="answer-btns" id="q-btns" style="display:none;">
    <button class="ok-btn" onclick="answer(true)">✓</button>
    <button class="miss-btn" onclick="answer(false)">✗</button>
  </div>
</div>

<div id="screen-result" style="display:none;"></div>

<script>
const KEY = "vocab-words-v1";
let words = [], queue = [], idx = 0, results = [], N = 7, showEtym = false;

async function load() {
  try { const r = await window.storage.get(KEY); words = r ? JSON.parse(r.value) : []; } catch { words = []; }
  const sub = document.getElementById('sub');
  sub.textContent = `TOEIC 忘却曲線学習 | ${words.length}単語`;
  if (words.length === 0) { show('empty'); return; }
  renderConfig(); show('config');
}

async function save() {
  try { await window.storage.set(KEY, JSON.stringify(words)); } catch {}
}

function show(s) {
  ['config','empty','quiz','result'].forEach(x => document.getElementById('screen-'+x).style.display = x===s?'':'none');
}

function score(w) {
  const days = w.last_tested ? (Date.now()-new Date(w.last_tested))/86400000 : 999;
  const mr = w.test_count > 0 ? w.miss_count/w.test_count : 0;
  return (5/(w.test_count+1)) + mr*4 + Math.min(days/7,3) + Math.random()*0.5;
}

function setN(n) {
  N = n;
  document.querySelectorAll('.count-btn').forEach(b => b.classList.toggle('active', b.textContent==n));
}

function renderConfig() {
  const untested = words.filter(w=>w.test_count===0).length;
  const struggling = words.filter(w=>w.test_count>0 && w.miss_count/w.test_count>0.5).length;
  document.getElementById('stats').innerHTML = [
    {l:'総単語',v:words.length,c:'#ede5ce'},
    {l:'未テスト',v:untested,c:'#ddb358'},
    {l:'苦手',v:struggling,c:'#b04a42'},
  ].map(({l,v,c})=>`<div class="stat"><div class="stat-n" style="color:${c}">${v}</div><div class="stat-l">${l}</div></div>`).join('');
}

function startTest() {
  queue = [...words].map(w=>({...w,_s:score(w)})).sort((a,b)=>b._s-a._s).slice(0,Math.min(N,words.length));
  idx = 0; results = []; showEtym = false;
  show('quiz'); renderQuiz();
}

function renderQuiz() {
  const w = queue[idx];
  const mr = w.test_count>0 ? Math.round(w.miss_count/w.test_count*100) : null;
  document.getElementById('q-counter').textContent = `${idx+1} / ${queue.length}`;
  document.getElementById('q-progress').style.width = `${Math.round(idx/queue.length*100)}%`;
  document.getElementById('q-word').textContent = w.word;
  document.getElementById('q-meta').textContent = w.test_count>0 ? `テスト${w.test_count}回 / ミス${w.miss_count}回` : '';
  document.getElementById('q-missrate').textContent = mr!==null ? `過去ミス率 ${mr}%` : '';
  document.getElementById('q-missrate').style.color = mr>50?'#b04a42':'#6e6248';
  document.getElementById('q-meaning').textContent = w.meaning_c || w.meaning_h;
  const hintEl = document.getElementById('q-hint');
  if (w.hint) { hintEl.textContent = '💡 ' + w.hint; hintEl.style.display=''; } else hintEl.style.display='none';
  const etymBtn = document.getElementById('q-etym-btn');
  if (w.etymology) { etymBtn.style.display=''; etymBtn.textContent='▶ 語源を見る'; } else etymBtn.style.display='none';
  document.getElementById('q-etym').style.display='none';
  showEtym = false;
  document.getElementById('q-hidden').style.display='';
  document.getElementById('q-revealed').style.display='none';
  document.getElementById('q-btns').style.display='none';
}

function reveal() {
  document.getElementById('q-hidden').style.display='none';
  document.getElementById('q-revealed').style.display='';
  document.getElementById('q-btns').style.display='flex';
}

function toggleEtym() {
  showEtym = !showEtym;
  const w = queue[idx];
  document.getElementById('q-etym').textContent = '🔍 ' + w.etymology;
  document.getElementById('q-etym').style.display = showEtym?'':'none';
  document.getElementById('q-etym-btn').textContent = (showEtym?'▲':'▶') + ' 語源を'+(showEtym?'隠す':'見る');
}

async function answer(ok) {
  const w = queue[idx];
  const today = new Date().toISOString().slice(0,10);
  const updated = {...w, test_count:w.test_count+1, miss_count:w.miss_count+(ok?0:1), last_tested:today};
  results.push({w:updated,ok});
  words = words.map(x=>x.id===w.id?updated:x);
  await save();
  if (idx+1>=queue.length) { show('result'); renderResult(); }
  else { idx++; showEtym=false; renderQuiz(); }
}

function renderResult() {
  const ok = results.filter(r=>r.ok).length;
  const pct = Math.round(ok/results.length*100);
  const col = pct>=80?'#4d9468':pct>=60?'#ddb358':'#b04a42';
  document.getElementById('screen-result').innerHTML = `
    <div class="result-pct" style="color:${col}">${pct}%</div>
    <div class="result-sub">${ok} / ${results.length} 正解</div>
    <div class="result-list">${results.map(r=>`
      <div class="result-item">
        <span style="font-size:14px;">${r.ok?'✓':'✗'}</span>
        <span style="color:${r.ok?'#ede5ce':'#b04a42'};font-weight:700;">${r.w.word}</span>
        <span style="color:#6e6248;">${r.w.meaning_h}</span>
      </div>`).join('')}
    </div>
    <div style="display:flex;gap:8px;">
      <button class="start-btn" onclick="location.reload()">もう一度</button>
    </div>`;
}

load();
</script>
</body>
</html>
```

---

## 重要ルール

1. 単語リスト入力 → **チャットで解説表示 ＋ show_widgetで保存**（UIアプリは表示しない）
2. 「テストして」→ **show_widgetでフラッシュカードテストを表示**
3. 固有名詞・明らかな非単語はスキップしてユーザーに通知
4. 一度に50単語まで処理可能
5. `/english-vocab-trainer` と打たれたときも単語入力待ちの案内をチャットで返すだけでよい（UIアプリ表示不要）

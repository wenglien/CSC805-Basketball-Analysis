// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const LC = '#552583', WC = '#FFC72C';
const LB = 'rgba(85,37,131,.15)', WB = 'rgba(255,199,44,.15)';
const GRID_DARK = 'rgba(255,255,255,.05)';

// Radar chart: normalization ceiling for each stat
const RADAR_KEYS   = ['pts', 'ast', 'reb', 'fg', 'three', 'blk', 'stl'];
const RADAR_LABELS = ['PTS', 'AST', 'REB', 'FG%', '3P%', 'BLK', 'STL'];
const RADAR_CAPS   = [ 35,    10,    15,    70,    50,     3,     2    ];

const SEASON_LABELS = ['2020-21', '2021-22', '2022-23', '2023-24', '2024-25'];
const SEASON_KEYS   = ['2020', '2021', '2022', '2023', '2024'];

const SEASON_FILES = [
  { key:'2020', label:'2020-21', lal:'datasets/lakers/lakers2020-2021.csv',  gsw:'datasets/warriors/warriors2020-2021.csv'  },
  { key:'2021', label:'2021-22', lal:'datasets/lakers/lakers2021-2022.csv',  gsw:'datasets/warriors/warriors2021-2022.csv'  },
  { key:'2022', label:'2022-23', lal:'datasets/lakers/lakers2022-2023.csv',  gsw:'datasets/warriors/warriors2022-2023.csv'  },
  { key:'2023', label:'2023-24', lal:'datasets/lakers/lakers2023-2024.csv',  gsw:'datasets/warriors/warriors2023-2024.csv'  },
  { key:'2024', label:'2024-25', lal:'datasets/lakers/lakers2024-2025.csv',  gsw:'datasets/warriors/warriors2024-2025.csv'  },
];

// ── STATE ─────────────────────────────────────────────────────────────────────
let teamData   = {};
let lalPlayers = {};
let gswPlayers = {};

// ── CSV UTILITIES ─────────────────────────────────────────────────────────────
async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Cannot load "${url}" (HTTP ${r.status})`);
  return r.text();
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const hdrs = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).flatMap(line => {
    const vals = line.split(',');
    const row  = {};
    hdrs.forEach((h, j) => {
      const v = (vals[j] || '').trim();
      row[h]  = v === '' ? null : isNaN(v) ? v : parseFloat(v);
    });
    return (row['Player'] && typeof row['Player'] === 'string') ? [row] : [];
  });
}

function toPct(v) { return v != null ? Math.round(v * 1000) / 10 : 0; }

function extractTeamStats(row) {
  return { pts: row['PTS'], ast: row['AST'], reb: row['TRB'], fg: toPct(row['FG%']), three_att: row['3PA'] };
}

function collectBestSeasons(rows, map) {
  for (const r of rows) {
    if (r['Player'] === 'Team Totals' || r['PTS'] == null) continue;
    const n = r['Player'];
    if (!map[n] || r['PTS'] > map[n].pts) {
      map[n] = {
        pts: r['PTS'],     ast:   r['AST']   || 0, reb: r['TRB'] || 0,
        fg:  toPct(r['FG%']), three: toPct(r['3P%']),
        blk: r['BLK']     || 0, stl:   r['STL']   || 0, tov: r['TOV'] || 0,
      };
    }
  }
}

function sortByPts(map) {
  return Object.fromEntries(Object.entries(map).sort((a, b) => b[1].pts - a[1].pts));
}

// ── DATA LOADING ──────────────────────────────────────────────────────────────
async function loadAllData() {
  const bar  = document.getElementById('loaderBar');
  const file = document.getElementById('loaderFile');

  for (let i = 0; i < SEASON_FILES.length; i++) {
    const { key, label, lal, gsw } = SEASON_FILES[i];
    if (file) file.textContent = `Loading ${label} season...`;
    if (bar)  bar.style.width  = `${(i / SEASON_FILES.length) * 90}%`;

    const [lalRows, gswRows] = (await Promise.all([fetchText(lal), fetchText(gsw)])).map(parseCSV);

    const lt = lalRows.find(r => r['Player'] === 'Team Totals');
    const gt = gswRows.find(r => r['Player'] === 'Team Totals');
    if (!lt || !gt) throw new Error(`Team Totals row missing in season ${label}`);

    teamData[key] = { lal: extractTeamStats(lt), gsw: extractTeamStats(gt) };
    collectBestSeasons(lalRows, lalPlayers);
    collectBestSeasons(gswRows, gswPlayers);
  }

  lalPlayers = sortByPts(lalPlayers);
  gswPlayers = sortByPts(gswPlayers);

  if (bar)  bar.style.width   = '100%';
  if (file) file.textContent  = 'Done!';
}

// ── BOOTSTRAP ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const overlay = document.getElementById('loadingOverlay');
  try {
    await loadAllData();
    await new Promise(r => setTimeout(r, 300));
    overlay.remove();
  } catch (err) {
    console.error(err);
    overlay.innerHTML = errorHTML(err.message);
  }
});

function errorHTML(msg) {
  return `
    <div style="text-align:center;padding:2rem;font-family:'IBM Plex Mono',monospace;max-width:480px">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:#FDB927;letter-spacing:3px;margin-bottom:1.2rem">
        ⚠ DATA LOAD FAILED
      </div>
      <div style="color:#7a7a8a;font-size:.82rem;line-height:1.9">
        This page reads CSV files via HTTP and requires a local web server.<br>
        Open a terminal in the project folder and run:
      </div>
      <code style="display:block;background:#1c1c28;color:#FFC72C;padding:.8rem 1.5rem;
        border-radius:8px;margin:1rem auto;font-size:.95rem;border:1px solid rgba(255,255,255,.1)">
        python -m http.server 8000
      </code>
      <div style="color:#555;font-size:.78rem">
        Then open: <span style="color:#FDB927">http://localhost:8000/main.html</span>
      </div>
      <div style="color:#333;font-size:.65rem;margin-top:.75rem;word-break:break-all">${msg}</div>
    </div>`;
}

// ── CHART SETUP ───────────────────────────────────────────────────────────────
Chart.defaults.color        = '#7a7a8a';
Chart.defaults.borderColor  = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family  = "'IBM Plex Mono',monospace";
Chart.defaults.font.size    = 11;

const charts = {};
function dc(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

function barDataset(label, data, col, bg, radius = 4) {
  return { label, data, backgroundColor: bg, borderColor: col, borderWidth: 2, borderRadius: radius };
}

function lineDataset(label, data, col, bg, fill = false) {
  return { label, data, borderColor: col, backgroundColor: bg, fill,
           tension: .4, pointBackgroundColor: col, pointRadius: 4, pointHoverRadius: 6 };
}

function makeBarChart(id, labels, lalData, gswData, extraOpts = {}) {
  dc(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        barDataset('Lakers',   lalData, LC, LB, extraOpts.radius),
        barDataset('Warriors', gswData, WC, WB, extraOpts.radius),
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        y: { beginAtZero: false, min: 0, grid: { color: GRID_DARK }, ...extraOpts.y },
        x: { grid: { display: false } },
      },
    },
  });
}

function makeLineChart(id, datasets, yOpts = {}) {
  dc(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: 'line',
    data: { labels: SEASON_LABELS, datasets },
    options: {
      responsive: true,
      plugins: {
        legend:  { display: false },
        tooltip: { mode: 'index', intersect: false, ...yOpts.tooltip },
      },
      scales: {
        y: { grid: { color: GRID_DARK }, ...yOpts },
        x: { grid: { display: false } },
      },
    },
  });
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
const PAGE_INIT = {
  season:    () => updateSeasonPage(),
  player:    initPlayerPage,
  team:      () => updateTeamPage(),
  analytics: initAnalyticsPage,
};

function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (btn) btn.classList.add('active');
  PAGE_INIT[id]?.();
}

function showPageByName(id) {
  const idx = { home: 0, season: 1, player: 2, team: 3, analytics: 4 };
  showPage(id, document.querySelectorAll('nav button')[idx[id]]);
}

// ── SEASON PAGE ───────────────────────────────────────────────────────────────
function updateSeasonPage() {
  const key = document.getElementById('seasonSelect').value;
  const d   = teamData[key];
  if (!d) return;

  document.getElementById('seasonStatCards').innerHTML = [
    statCard('Points Per Game',   d.lal.pts, d.gsw.pts),
    statCard('Rebounds Per Game', d.lal.reb, d.gsw.reb),
    statCard('Assists Per Game',  d.lal.ast, d.gsw.ast),
  ].join('');

  makeBarChart('seasonChart',
    ['Points', 'Rebounds', 'Assists', 'FG%'],
    [d.lal.pts, d.lal.reb, d.lal.ast, d.lal.fg],
    [d.gsw.pts, d.gsw.reb, d.gsw.ast, d.gsw.fg],
  );
}

function statCard(label, lal, gsw) {
  const lalWins = lal > gsw;
  const badge   = lalWins ? 'win-lal' : 'win-gsw';
  const tag     = lalWins ? 'LAL ▲'   : 'GSW ▲';
  return `<div class="stat-card">
    <div class="stat-card-label">${label}<span class="winner-badge ${badge}">${tag}</span></div>
    <div class="stat-card-values">
      <div class="stat-team"><span class="stat-team-name">LAL</span><span class="stat-team-val val-lakers">${lal}</span></div>
      <div class="divider">|</div>
      <div class="stat-team"><span class="stat-team-name">GSW</span><span class="stat-team-val val-warriors">${gsw}</span></div>
    </div>
  </div>`;
}

// ── PLAYER PAGE ───────────────────────────────────────────────────────────────
let ppInit = false;
function initPlayerPage() {
  if (!ppInit) {
    const s1 = document.getElementById('player1Select');
    const s2 = document.getElementById('player2Select');
    Object.keys(lalPlayers).forEach(n => s1.add(new Option(n, n)));
    Object.keys(gswPlayers).forEach(n => s2.add(new Option(n, n)));
    ppInit = true;
  }
  updatePlayerPage();
}

function updatePlayerPage() {
  const p1 = document.getElementById('player1Select').value;
  const p2 = document.getElementById('player2Select').value;
  const s1 = lalPlayers[p1];
  const s2 = gswPlayers[p2];
  if (!s1 || !s2) return;

  setPlayerCard('p1', p1, s1, LC, LB, 'radarChart1', 'statBars1');
  setPlayerCard('p2', p2, s2, WC, WB, 'radarChart2', 'statBars2');
}

function setPlayerCard(prefix, name, stats, col, bg, radarId, barsId) {
  document.getElementById(`${prefix}name`).textContent  = name;
  document.getElementById(`${prefix}badge`).textContent = initials(name);
  drawRadar(radarId, stats, col, bg);
  drawBars(barsId, stats, col);
}

function initials(name) {
  return name.split(' ').filter(w => /[A-Z]/.test(w[0])).map(w => w[0]).slice(0, 2).join('');
}

function drawRadar(id, s, col, bg) {
  dc(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: 'radar',
    data: {
      labels: RADAR_LABELS,
      datasets: [{
        data:               RADAR_KEYS.map((k, i) => s[k] / RADAR_CAPS[i] * 100),
        borderColor:        col,
        backgroundColor:    bg,
        borderWidth:        2,
        pointBackgroundColor: col,
        pointRadius:        3,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend:  { display: false },
        tooltip: { callbacks: { label: ctx => radarTooltip(ctx, s) } },
      },
      scales: {
        r: {
          beginAtZero: true, max: 100,
          grid:        { color: 'rgba(255,255,255,.08)' },
          angleLines:  { color: 'rgba(255,255,255,.08)' },
          ticks:       { display: false },
          pointLabels: { color: '#7a7a8a', font: { size: 10 } },
        },
      },
    },
  });
}

function radarTooltip(ctx, s) {
  const k      = RADAR_KEYS[ctx.dataIndex];
  const suffix = (k === 'fg' || k === 'three') ? '%' : '';
  return `${RADAR_LABELS[ctx.dataIndex]}: ${s[k]}${suffix}`;
}

function drawBars(id, s, col) {
  const stats = [
    { l:'PTS', v:s.pts,   m:35 },
    { l:'AST', v:s.ast,   m:10 },
    { l:'REB', v:s.reb,   m:15 },
    { l:'FG%', v:s.fg,    m:65 },
    { l:'3P%', v:s.three, m:50 },
  ];
  document.getElementById(id).innerHTML = stats.map(({ l, v, m }) => `
    <div class="stat-row">
      <div class="stat-label">${l}</div>
      <div class="stat-bar-bg">
        <div class="stat-bar-fill" style="width:${Math.min(100, v / m * 100).toFixed(1)}%;background:${col}"></div>
      </div>
      <div class="stat-val">${v}${l.includes('%') ? '%' : ''}</div>
    </div>`).join('');
}

// ── TEAM PAGE ─────────────────────────────────────────────────────────────────
function updateTeamPage() {
  const key = document.getElementById('teamSeasonSelect').value;
  const d   = teamData[key];
  if (!d) return;

  makeBarChart('teamBarChart',
    ['Points', 'Rebounds', 'Assists'],
    [d.lal.pts, d.lal.reb, d.lal.ast],
    [d.gsw.pts, d.gsw.reb, d.gsw.ast],
    { radius: 6 },
  );

  document.getElementById('teamStatCards').innerHTML = [
    statCard('Points Per Game',   d.lal.pts, d.gsw.pts),
    statCard('Rebounds Per Game', d.lal.reb, d.gsw.reb),
    statCard('Assists Per Game',  d.lal.ast, d.gsw.ast),
  ].join('');
}

// ── ANALYTICS PAGE ────────────────────────────────────────────────────────────
let anInit = false;
function initAnalyticsPage() {
  if (anInit) return;
  anInit = true;

  const get = (team, stat) => SEASON_KEYS.map(k => teamData[k][team][stat]);

  makeLineChart('ptsChart', [
    lineDataset('Lakers',   get('lal', 'pts'), LC, 'transparent'),
    lineDataset('Warriors', get('gsw', 'pts'), WC, 'transparent'),
  ]);

  makeLineChart('fgChart', [
    lineDataset('LAL FG%', get('lal', 'fg'), LC, 'transparent'),
    lineDataset('GSW FG%', get('gsw', 'fg'), WC, 'transparent'),
  ], {
    ticks:   { callback: v => v + '%' },
    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%` } },
  });

  makeLineChart('threeChart', [
    lineDataset('Lakers 3PA',   get('lal', 'three_att'), LC, LB, true),
    lineDataset('Warriors 3PA', get('gsw', 'three_att'), WC, WB, true),
  ]);
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function saveChart(id) {
  const a    = document.createElement('a');
  a.download = `${id}_export.png`;
  a.href     = document.getElementById(id).toDataURL('image/png');
  a.click();
}

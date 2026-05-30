import { renderDetailPanel } from './details.js';
import { CctvFeedPlayer } from './cctvFeed.js';
import { SpyHud } from './spyHud.js';

export const DATA_LAYERS = [
  {
    id: 'flights',
    name: 'Live Flights',
    source: 'OpenSky Network',
    icon: '✈',
  },
  {
    id: 'military',
    name: 'Military Flights',
    source: 'adsb.lol',
    icon: '⬡',
  },
  {
    id: 'earthquakes',
    name: 'Earthquakes (24h)',
    source: 'USGS',
    icon: '◎',
  },
  {
    id: 'satellites',
    name: 'Satellites',
    source: 'CelesTrak',
    icon: '◉',
  },
  {
    id: 'cctv',
    name: 'CCTV Mesh',
    source: 'Open Eagle Eye · 40+ countries',
    icon: '⌖',
  },
  {
    id: 'traffic',
    name: 'Street Traffic',
    source: 'OpenStreetMap',
    icon: '▣',
    disabled: true,
  },
  {
    id: 'weather',
    name: 'Weather Radar',
    source: 'NOAA NEXRAD',
    icon: '☁',
    disabled: true,
  },
  {
    id: 'bikeshare',
    name: 'Bikeshare',
    source: 'GBFS',
    icon: '◎',
    disabled: true,
  },
];

const STYLE_CLASSES = [
  'style-crt',
  'style-nvg',
  'style-flir',
  'style-noir',
  'style-snow',
  'style-anime',
];

export function mountWorldviewUI(viewer, handlers) {
  const overlay = document.createElement('div');
  overlay.id = 'worldview-overlay';

  const now = new Date();
  const rec = now.toISOString().replace('T', ' ').slice(0, 19) + 'Z';

  overlay.innerHTML = `
    <header class="wv-header">
      <div class="wv-logo">RAYSpy</div>
      <div class="wv-tagline">NO PLACE LEFT BEHIND</div>
      <div class="wv-classification">OPEN DATA // PUBLIC FEEDS // EDUCATIONAL<br/>TLE · ADS-B · CCTV MESH</div>
      <div class="wv-summary" id="wv-summary">Hybrid map · no terrain until DEM enabled</div>
    </header>

    <div class="wv-rec"><span class="dot">●</span> REC ${rec}<br/>ORB: LIVE · PASS: —</div>
    <div class="wv-active-style">ACTIVE STYLE<br/><strong id="wv-style-label">NORMAL</strong></div>

    <div class="wv-search">
      <input type="text" id="search-input" placeholder="Search city…" />
      <button type="button" id="search-btn">SEARCH</button>
    </div>

    <aside class="wv-dock wv-dock-left" id="dock-left">
      <button type="button" class="wv-dock-toggle" id="collapse-left" title="Collapse panel">‹</button>
      <div class="wv-dock-body">
        <section class="wv-panel wv-layers-inner">
          <h2>DATA LAYERS</h2>
          <div id="wv-layer-list"></div>
        </section>
        <section class="wv-panel wv-cctv-panel" id="cctv-panel" hidden>
          <h2>CCTV MESH</h2>
          <div class="wv-cctv-btns">
            <button type="button" class="wv-chip active" id="cctv-on">CCTV ON</button>
            <button type="button" class="wv-chip" id="cctv-nearest">NEAREST</button>
            <button type="button" class="wv-chip" id="cctv-prev">PREV</button>
            <button type="button" class="wv-chip" id="cctv-next">NEXT</button>
          </div>
          <label class="wv-field-label">Location
            <select id="cctv-select"></select>
          </label>
          <div class="wv-cctv-btns">
            <button type="button" class="wv-chip active" id="cctv-coverage">COVERAGE ON</button>
            <button type="button" class="wv-chip" id="cctv-projection">PROJECTION</button>
            <button type="button" class="wv-chip active" id="cctv-align">ALIGN · DRAPE</button>
          </div>
          <div class="wv-cal-sliders" id="cctv-sliders">
            <label>HEADING <input type="range" data-cal="heading" min="0" max="360" value="180" /></label>
            <label>PITCH <input type="range" data-cal="pitch" min="-45" max="5" value="-10" /></label>
            <label>FOV <input type="range" data-cal="fov" min="20" max="90" value="45" /></label>
            <label>RANGE <input type="range" data-cal="range" min="200" max="2000" value="600" /></label>
            <label>HEIGHT <input type="range" data-cal="height" min="20" max="400" value="120" /></label>
          </div>
          <div class="wv-cctv-preview" id="cctv-preview">
            <span class="wv-cctv-preview-placeholder">Select a node for live feed</span>
          </div>
          <p class="wv-cctv-hint">Worldwide public cameras (Open Eagle Eye) · ~2s snapshot refresh</p>
        </section>
      </div>
    </aside>

    <aside class="wv-dock wv-dock-right" id="dock-right">
      <button type="button" class="wv-dock-toggle" id="collapse-right" title="Collapse panel">›</button>
      <div class="wv-dock-body">
        <nav class="wv-right-tabs">
          <button type="button" class="active" data-tab="controls">OPS</button>
          <button type="button" data-tab="intel">INTEL</button>
        </nav>
        <div class="wv-tab-pane active" id="tab-controls">
          <button type="button" class="wv-ctrl-btn" id="btn-dem">TERRAIN / DEM</button>
          <button type="button" class="wv-ctrl-btn" id="btn-bloom">BLOOM</button>
          <button type="button" class="wv-ctrl-btn" id="btn-sharpen">SHARPEN</button>
          <div class="wv-slider-row" id="sharpen-row" hidden>
            SHARPEN <span id="sharpen-val">50</span>%
            <input type="range" id="sharpen-range" min="0" max="100" value="50" />
          </div>
          <button type="button" class="wv-ctrl-btn" id="btn-hud">HUD</button>
          <button type="button" class="wv-ctrl-btn active" id="btn-panoptic">PANOPTIC</button>
          <div class="wv-slider-row" id="density-row">
            DENSITY <span id="density-val">58</span>%
            <input type="range" id="density-range" min="10" max="100" value="58" />
          </div>
          <button type="button" class="wv-ctrl-btn" id="btn-clean-ui">CLEAN UI</button>
          <h3 class="wv-subhead">PARAMETERS</h3>
          <div class="wv-slider-row">
            PIXELATION <span id="px-val">0</span>%
            <input type="range" id="fx-pixelation" min="0" max="100" value="0" />
          </div>
          <div class="wv-slider-row">
            DISTORTION <span id="dist-val">0</span>%
            <input type="range" id="fx-distortion" min="0" max="100" value="0" />
          </div>
          <div class="wv-slider-row">
            INSTABILITY <span id="inst-val">0</span>%
            <input type="range" id="fx-instability" min="0" max="100" value="0" />
          </div>
        </div>
        <div class="wv-tab-pane" id="tab-intel">
          <div id="wv-detail-panel"></div>
        </div>
      </div>
    </aside>

    <footer class="wv-footer">
      <div class="wv-panel wv-locations">
        <h3>LOCATIONS +</h3>
        <div class="row">Location: <span id="wv-loc">—</span></div>
        <div class="row">Landmark: <span id="wv-landmark">—</span></div>
      </div>
      <div class="wv-panel wv-styles">
        <h3>STYLE PRESETS</h3>
        <div class="wv-style-btns">
          <button type="button" data-style="normal" class="active">NORMAL</button>
          <button type="button" data-style="crt">CRT</button>
          <button type="button" data-style="nvg">NVG</button>
          <button type="button" data-style="flir">FLIR</button>
          <button type="button" data-style="noir">NOIR</button>
          <button type="button" data-style="snow">SNOW</button>
          <button type="button" data-style="anime">ANIME</button>
        </div>
      </div>
    </footer>

    <div class="wv-selection-hud" id="wv-selection-hud"></div>
    <div class="wv-cctv-hud" id="cctv-hud-feed" hidden></div>
  `;

  document.getElementById('worldview-app').appendChild(overlay);

  const spyHud = new SpyHud(viewer, overlay);

  const detailEl = overlay.querySelector('#wv-detail-panel');
  const previewFeed = new CctvFeedPlayer(
    overlay.querySelector('#cctv-preview')
  );
  const hudFeed = new CctvFeedPlayer(overlay.querySelector('#cctv-hud-feed'));
  let detailFeed = null;

  renderDetailPanel(detailEl, null);

  const layerList = overlay.querySelector('#wv-layer-list');
  const layerState = {};

  for (const layer of DATA_LAYERS) {
    layerState[layer.id] = false;
    const row = document.createElement('div');
    row.className = `wv-layer-row${layer.disabled ? ' disabled' : ''}`;
    row.dataset.layer = layer.id;
    row.innerHTML = `
      <div class="wv-layer-icon">${layer.icon}</div>
      <div class="wv-layer-info">
        <div class="wv-layer-name">${layer.name}</div>
        <div class="wv-layer-source">${layer.source}</div>
      </div>
      <span class="wv-layer-count" data-count="${layer.id}"></span>
      <div class="wv-toggle" data-toggle="${layer.id}"></div>
    `;
    if (!layer.disabled) {
      row.addEventListener('click', () => handlers.onLayerToggle(layer.id));
    }
    layerList.appendChild(row);
  }

  const ui = {
    overlay,
    detailEl,
    setLayerOn(layerId, on) {
      layerState[layerId] = on;
      const toggle = overlay.querySelector(`[data-toggle="${layerId}"]`);
      if (toggle) toggle.classList.toggle('on', on);
      if (layerId === 'cctv') {
        overlay.querySelector('#cctv-panel').hidden = !on;
      }
    },
    setLayerCount(layerId, count) {
      const el = overlay.querySelector(`[data-count="${layerId}"]`);
      if (!el) return;
      el.textContent = count != null && count > 0 ? formatCount(count) : '';
    },
    setSummary(text) {
      const el = overlay.querySelector('#wv-summary');
      if (el) el.textContent = text;
    },
    setSelection(text) {
      const hud = overlay.querySelector('#wv-selection-hud');
      if (!text) {
        hud.classList.remove('visible');
        hud.textContent = '';
        return;
      }
      hud.textContent = text;
      hud.classList.add('visible');
    },
    setSpyTrack(detail) {
      if (!detail?.trackEntity || !detail?.hudTag) {
        spyHud.clear();
        return;
      }
      spyHud.track(detail.trackEntity, {
        tag: detail.hudTag,
        military: !!detail.military,
      });
    },
    clearSpyTrack() {
      spyHud.clear();
    },
    setLocation(loc, landmark) {
      overlay.querySelector('#wv-loc').textContent = loc || '—';
      overlay.querySelector('#wv-landmark').textContent = landmark || '—';
    },
    setStyleLabel(name) {
      overlay.querySelector('#wv-style-label').textContent = name;
    },
    setDemEnabled() {
      const btn = overlay.querySelector('#btn-dem');
      btn.textContent = 'DEM ENABLED';
      btn.classList.add('active');
      btn.disabled = true;
    },
    setDetail(detail) {
      if (detailFeed) detailFeed.stop();
      detailFeed = null;
      renderDetailPanel(detailEl, detail);
      if (detail?.type === 'cctv' && detail.feedUrl) {
        const slot = detailEl.querySelector('#detail-cctv-feed');
        if (slot) {
          detailFeed = new CctvFeedPlayer(slot);
          detailFeed.play(detail.feedUrl, { label: detail.title });
        }
      }
      if (detail) ui.openIntelTab();
    },
    openIntelTab() {
      overlay.querySelectorAll('.wv-right-tabs button').forEach((b) => {
        b.classList.toggle('active', b.dataset.tab === 'intel');
      });
      overlay.querySelector('#tab-controls').classList.remove('active');
      overlay.querySelector('#tab-intel').classList.add('active');
    },
    populateCctvSelect(cameras, selectedId) {
      const sel = overlay.querySelector('#cctv-select');
      const byCountry = new Map();
      for (const c of cameras) {
        const cc = c.country || 'XX';
        if (!byCountry.has(cc)) byCountry.set(cc, []);
        byCountry.get(cc).push(c);
      }
      let html = '';
      for (const cc of [...byCountry.keys()].sort()) {
        html += `<optgroup label="${cc}">`;
        for (const c of byCountry.get(cc)) {
          html += `<option value="${c.id}"${c.id === selectedId ? ' selected' : ''}>${c.city} — ${c.label}</option>`;
        }
        html += '</optgroup>';
      }
      sel.innerHTML = html;
    },
    updateCctvPreview(detail) {
      if (!detail?.feedUrl) {
        previewFeed.stop();
        hudFeed.stop();
        overlay.querySelector('#cctv-hud-feed').hidden = true;
        return;
      }
      previewFeed.play(detail.feedUrl, { label: detail.title });
      const hud = overlay.querySelector('#cctv-hud-feed');
      hud.hidden = false;
      hudFeed.play(detail.feedUrl, { label: detail.title });
    },
    stopCctvFeeds() {
      previewFeed.stop();
      hudFeed.stop();
      overlay.querySelector('#cctv-hud-feed').hidden = true;
      if (detailFeed) detailFeed.stop();
      detailFeed = null;
    },
    syncCctvSliders(cal) {
      if (!cal) return;
      overlay.querySelectorAll('#cctv-sliders [data-cal]').forEach((input) => {
        const key = input.dataset.cal;
        if (cal[key] != null) input.value = cal[key];
      });
    },
  };

  overlay.querySelector('#collapse-left').addEventListener('click', () => {
    overlay.querySelector('#dock-left').classList.toggle('collapsed');
  });
  overlay.querySelector('#collapse-right').addEventListener('click', () => {
    overlay.querySelector('#dock-right').classList.toggle('collapsed');
  });

  overlay.querySelectorAll('.wv-right-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      overlay.querySelectorAll('.wv-right-tabs button').forEach((b) => {
        b.classList.toggle('active', b.dataset.tab === tab);
      });
      overlay.querySelector('#tab-controls').classList.toggle('active', tab === 'controls');
      overlay.querySelector('#tab-intel').classList.toggle('active', tab === 'intel');
    });
  });

  overlay.querySelector('#btn-dem').addEventListener('click', handlers.onLoadDem);
  overlay.querySelector('#btn-clean-ui').addEventListener('click', () => {
    overlay.classList.toggle('clean-ui');
  });

  const cesiumEl = document.getElementById('cesiumContainer');
  const applyFxParams = () => {
    const px = overlay.querySelector('#fx-pixelation').value;
    const dist = overlay.querySelector('#fx-distortion').value;
    const inst = overlay.querySelector('#fx-instability').value;
    overlay.querySelector('#px-val').textContent = px;
    overlay.querySelector('#dist-val').textContent = dist;
    overlay.querySelector('#inst-val').textContent = inst;
    cesiumEl.style.setProperty('--fx-pixel', `${px}%`);
    cesiumEl.style.setProperty('--fx-distort', `${dist * 0.15}deg`);
    cesiumEl.style.setProperty('--fx-jitter', `${inst * 0.08}px`);
  };
  ['fx-pixelation', 'fx-distortion', 'fx-instability'].forEach((id) => {
    overlay.querySelector(`#${id}`).addEventListener('input', applyFxParams);
  });

  overlay.querySelectorAll('[data-style]').forEach((btn) => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('[data-style]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const style = btn.dataset.style;
      cesiumEl.classList.remove(...STYLE_CLASSES, 'fx-params-on');
      if (style !== 'normal') {
        cesiumEl.classList.add(`style-${style}`);
        if (['nvg', 'flir'].includes(style)) cesiumEl.classList.add('fx-params-on');
      }
      ui.setStyleLabel(style.toUpperCase());
    });
  });

  const bloomBtn = overlay.querySelector('#btn-bloom');
  bloomBtn.addEventListener('click', () => {
    bloomBtn.classList.toggle('active');
    cesiumEl.classList.toggle('fx-bloom');
  });

  const sharpenBtn = overlay.querySelector('#btn-sharpen');
  const sharpenRow = overlay.querySelector('#sharpen-row');
  sharpenBtn.addEventListener('click', () => {
    sharpenBtn.classList.toggle('active');
    sharpenRow.hidden = !sharpenBtn.classList.contains('active');
    cesiumEl.classList.toggle('fx-sharpen', sharpenBtn.classList.contains('active'));
  });
  overlay.querySelector('#sharpen-range').addEventListener('input', (e) => {
    overlay.querySelector('#sharpen-val').textContent = e.target.value;
  });

  overlay.querySelector('#btn-panoptic').addEventListener('click', () => {
    const on = overlay.querySelector('#btn-panoptic').classList.toggle('active');
    handlers.onPanoptic?.(on);
  });

  overlay.querySelector('#btn-hud').addEventListener('click', (e) => {
    e.target.classList.toggle('active');
    const hud = overlay.querySelector('#wv-selection-hud');
    hud.style.borderWidth = e.target.classList.contains('active') ? '2px' : '1px';
  });

  const searchBtn = overlay.querySelector('#search-btn');
  const searchInput = overlay.querySelector('#search-input');
  searchBtn.addEventListener('click', () => handlers.onSearch(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handlers.onSearch(searchInput.value);
  });

  overlay.querySelector('#cctv-nearest').addEventListener('click', () => {
    handlers.onCctvAction?.('nearest');
  });
  overlay.querySelector('#cctv-prev').addEventListener('click', () => {
    handlers.onCctvAction?.('prev');
  });
  overlay.querySelector('#cctv-next').addEventListener('click', () => {
    handlers.onCctvAction?.('next');
  });
  overlay.querySelector('#cctv-coverage').addEventListener('click', (e) => {
    e.target.classList.toggle('active');
    handlers.onCctvCoverage?.(e.target.classList.contains('active'));
  });
  overlay.querySelector('#cctv-projection').addEventListener('click', (e) => {
    e.target.classList.toggle('active');
    handlers.onCctvProjection?.(e.target.classList.contains('active'));
  });
  overlay.querySelector('#cctv-select').addEventListener('change', (e) => {
    handlers.onCctvSelect?.(e.target.value);
  });
  overlay.querySelectorAll('#cctv-sliders [data-cal]').forEach((input) => {
    input.addEventListener('input', () => {
      const patch = {};
      overlay.querySelectorAll('#cctv-sliders [data-cal]').forEach((el) => {
        patch[el.dataset.cal] = Number(el.value);
      });
      handlers.onCctvCalibration?.(patch);
    });
  });

  return ui;
}

function formatCount(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

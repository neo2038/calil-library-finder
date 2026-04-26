const CALIL_API = 'https://api.calil.jp/library';

const apiKeySection = document.getElementById('apiKeySection');
const searchSection = document.getElementById('searchSection');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const searchBtn = document.getElementById('searchBtn');
const changeApiKeyBtn = document.getElementById('changeApiKey');
const limitSelect = document.getElementById('limitSelect');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

function getStoredApiKey() {
  return localStorage.getItem('calil_appkey') || '';
}

function init() {
  const key = getStoredApiKey();
  if (key) {
    showSearchSection();
  } else {
    showApiKeySection();
  }
}

function showApiKeySection() {
  apiKeySection.hidden = false;
  searchSection.hidden = true;
  apiKeyInput.value = getStoredApiKey();
}

function showSearchSection() {
  apiKeySection.hidden = true;
  searchSection.hidden = false;
}

function showStatus(message, type = 'loading') {
  statusEl.hidden = false;
  statusEl.className = `status ${type}`;
  if (type === 'loading') {
    statusEl.innerHTML = `<div class="spinner"></div><span>${message}</span>`;
  } else {
    statusEl.textContent = message;
  }
}

function hideStatus() {
  statusEl.hidden = true;
}

saveApiKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showStatus('APIキーを入力してください', 'error');
    statusEl.hidden = false;
    return;
  }
  localStorage.setItem('calil_appkey', key);
  showSearchSection();
  hideStatus();
  resultsEl.innerHTML = '';
});

apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveApiKeyBtn.click();
});

changeApiKeyBtn.addEventListener('click', () => {
  showApiKeySection();
  hideStatus();
  resultsEl.innerHTML = '';
});

searchBtn.addEventListener('click', searchNearbyLibraries);

function searchNearbyLibraries() {
  const appkey = getStoredApiKey();
  if (!appkey) {
    showStatus('APIキーが設定されていません', 'error');
    return;
  }

  if (!navigator.geolocation) {
    showStatus('このブラウザは位置情報に対応していません', 'error');
    return;
  }

  searchBtn.disabled = true;
  showStatus('現在地を取得中...', 'loading');
  resultsEl.innerHTML = '';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      showStatus('図書館を検索中...', 'loading');
      fetchLibraries(appkey, longitude, latitude);
    },
    (err) => {
      searchBtn.disabled = false;
      const msg = {
        1: '位置情報の取得が許可されていません。ブラウザの設定を確認してください。',
        2: '位置情報を取得できませんでした。',
        3: '位置情報の取得がタイムアウトしました。',
      }[err.code] || '位置情報の取得に失敗しました。';
      showStatus(msg, 'error');
    },
    { timeout: 10000 }
  );
}

function fetchLibraries(appkey, longitude, latitude) {
  const limit = limitSelect.value;
  const callbackName = 'calilCallback_' + Date.now();

  const params = new URLSearchParams({
    appkey,
    geocode: `${longitude},${latitude}`,
    limit,
    format: 'json',
    callback: callbackName,
  });

  const script = document.createElement('script');
  script.src = `${CALIL_API}?${params}`;

  const timeout = setTimeout(() => {
    cleanup();
    searchBtn.disabled = false;
    showStatus('タイムアウトしました。APIキーを確認してください。', 'error');
  }, 15000);

  function cleanup() {
    delete window[callbackName];
    script.remove();
    clearTimeout(timeout);
  }

  window[callbackName] = (data) => {
    cleanup();
    searchBtn.disabled = false;
    renderResults(data, latitude, longitude);
  };

  script.onerror = () => {
    cleanup();
    searchBtn.disabled = false;
    showStatus('APIリクエストに失敗しました。APIキーを確認してください。', 'error');
  };

  document.head.appendChild(script);
}

const CATEGORY_LABELS = {
  'SMALL': '小規模図書館',
  'MEDIUM': '図書館',
  'LARGE': '大規模図書館',
  'UNIV': '大学図書館',
  'CORP': '企業・機関',
};

function renderResults(libraries, userLat, userLon) {
  if (!libraries || libraries.length === 0) {
    showStatus('近くに図書館が見つかりませんでした。', 'info');
    return;
  }

  hideStatus();

  const header = document.createElement('p');
  header.className = 'results-header';
  header.textContent = `${libraries.length}件の図書館が見つかりました`;

  const grid = document.createElement('div');
  grid.className = 'library-grid';

  libraries.forEach((lib) => {
    const card = document.createElement('div');
    card.className = 'library-card';

    const [libLon, libLat] = (lib.geocode || ',').split(',').map(Number);
    const distance = (libLat && libLon)
      ? calcDistance(userLat, userLon, libLat, libLon)
      : null;

    const categoryLabel = CATEGORY_LABELS[lib.category] || lib.category || '';

    card.innerHTML = `
      <div class="library-card-top">
        <span class="library-name">${escHtml(lib.formal || lib.systemname || '不明')}</span>
        ${categoryLabel ? `<span class="library-category">${escHtml(categoryLabel)}</span>` : ''}
      </div>
      ${lib.address ? `<div class="library-address">📍 ${escHtml(lib.address)}</div>` : ''}
      <div class="library-meta">
        ${distance !== null ? `<span style="font-size:0.85rem;color:#64748b">🚶 約 ${distance} km</span>` : ''}
        ${lib.url ? `<a class="library-link" href="${escHtml(lib.url)}" target="_blank" rel="noopener">🌐 ウェブサイト</a>` : ''}
        ${(libLat && libLon) ? `<a class="library-map-link" href="https://www.google.com/maps?q=${libLat},${libLon}" target="_blank" rel="noopener">🗺️ マップで見る</a>` : ''}
      </div>
    `;

    grid.appendChild(card);
  });

  resultsEl.innerHTML = '';
  resultsEl.appendChild(header);
  resultsEl.appendChild(grid);
}

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

init();

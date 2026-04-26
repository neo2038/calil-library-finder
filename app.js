const CALIL_API = 'https://api.calil.jp/library';
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';
const APPKEY = 'a8f2433228b319cb58bdf472b176e1d7';

const keywordInput = document.getElementById('keywordInput');
const keywordSearchBtn = document.getElementById('keywordSearchBtn');
const geoBtn = document.getElementById('geoBtn');
const limitSelect = document.getElementById('limitSelect');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

function setLoading(loading) {
  keywordSearchBtn.disabled = loading;
  geoBtn.disabled = loading;
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

keywordSearchBtn.addEventListener('click', handleKeywordSearch);
keywordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleKeywordSearch();
});
geoBtn.addEventListener('click', handleGeoSearch);

async function handleKeywordSearch() {
  const query = keywordInput.value.trim();
  if (!query) {
    showStatus('地名を入力してください', 'error');
    return;
  }

  setLoading(true);
  resultsEl.innerHTML = '';
  showStatus(`「${query}」の位置を検索中...`, 'loading');

  try {
    const geo = await geocodeKeyword(query);
    if (!geo) {
      showStatus(`「${query}」の位置が見つかりませんでした。別の地名を試してください。`, 'error');
      setLoading(false);
      return;
    }
    showStatus('図書館を検索中...', 'loading');
    fetchLibraries(geo.lon, geo.lat, query);
  } catch {
    showStatus('位置情報の取得に失敗しました。しばらく後でお試しください。', 'error');
    setLoading(false);
  }
}

function handleGeoSearch() {
  if (!navigator.geolocation) {
    showStatus('このブラウザは位置情報に対応していません', 'error');
    return;
  }

  setLoading(true);
  resultsEl.innerHTML = '';
  showStatus('現在地を取得中...', 'loading');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      showStatus('図書館を検索中...', 'loading');
      fetchLibraries(pos.coords.longitude, pos.coords.latitude, '現在地');
    },
    (err) => {
      setLoading(false);
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

async function geocodeKeyword(query) {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    countrycodes: 'jp',
    'accept-language': 'ja',
  });
  const res = await fetch(`${NOMINATIM_API}?${params}`, {
    headers: { 'Accept-Language': 'ja' },
  });
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

function fetchLibraries(longitude, latitude, label) {
  const limit = limitSelect.value;
  const callbackName = 'calilCallback_' + Date.now();

  const params = new URLSearchParams({
    appkey: APPKEY,
    geocode: `${longitude},${latitude}`,
    limit,
    format: 'json',
    callback: callbackName,
  });

  const script = document.createElement('script');
  script.src = `${CALIL_API}?${params}`;

  const timer = setTimeout(() => {
    cleanup();
    setLoading(false);
    showStatus('タイムアウトしました。しばらく後でお試しください。', 'error');
  }, 15000);

  function cleanup() {
    delete window[callbackName];
    script.remove();
    clearTimeout(timer);
  }

  window[callbackName] = (data) => {
    cleanup();
    setLoading(false);
    renderResults(data, latitude, longitude, label);
  };

  script.onerror = () => {
    cleanup();
    setLoading(false);
    showStatus('APIリクエストに失敗しました。しばらく後でお試しください。', 'error');
  };

  document.head.appendChild(script);
}

const CATEGORY_LABELS = {
  SMALL: '小規模図書館',
  MEDIUM: '図書館',
  LARGE: '大規模図書館',
  UNIV: '大学図書館',
  CORP: '企業・機関',
};

function renderResults(libraries, userLat, userLon, label) {
  if (!libraries || libraries.length === 0) {
    showStatus(`「${label}」周辺に図書館が見つかりませんでした。`, 'info');
    return;
  }

  hideStatus();

  const header = document.createElement('p');
  header.className = 'results-header';
  header.textContent = `「${label}」周辺の図書館 ${libraries.length}件`;

  const grid = document.createElement('div');
  grid.className = 'library-grid';

  libraries.forEach((lib) => {
    const card = document.createElement('div');
    card.className = 'library-card';

    const [libLon, libLat] = (lib.geocode || ',').split(',').map(Number);
    const distance = libLat && libLon
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
        ${distance !== null ? `<span class="distance">🚶 約 ${distance} km</span>` : ''}
        ${lib.url ? `<a class="library-link" href="${escHtml(lib.url)}" target="_blank" rel="noopener">🌐 ウェブサイト</a>` : ''}
        ${libLat && libLon ? `<a class="library-map-link" href="https://www.google.com/maps?q=${libLat},${libLon}" target="_blank" rel="noopener">🗺️ マップ</a>` : ''}
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

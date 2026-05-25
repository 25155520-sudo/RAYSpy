import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

async function init() {
  const accessToken = import.meta.env.VITE_CESIUM_TOKEN;
  console.log('Token found:', !!accessToken, '| length:', accessToken?.length);
  if (accessToken) {
    Cesium.Ion.defaultAccessToken = accessToken;
  }

  let terrainProvider;
  try {
    terrainProvider = await Cesium.createWorldTerrainAsync({
      requestWaterMask: true,
      requestVertexNormals: true,
    });
    console.log('Terrain provider created:', !!terrainProvider);
  } catch (e) {
    console.error('Terrain creation failed:', e);
  }

  const viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    vrButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    scene3DOnly: true,
    shouldAnimate: false,
    terrainProvider,
  });

  try {
    const streetLayer = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri, HERE, Garmin, © OpenStreetMap contributors',
        minimumLevel: 0,
        maximumLevel: 19,
      })
    );
    streetLayer.alpha = 0.5;
  } catch (e) {
    console.error('Failed to add street layer:', e);
  }

  const globe = viewer.scene.globe;
  if (terrainProvider) globe.terrainProvider = terrainProvider;
  globe.enableLighting = true;
  globe.terrainExaggeration = 2.0;
  globe.terrainExaggerationRelativeHeight = 0;

  const fog = viewer.scene.fog;
  fog.enabled = true;
  fog.density = 0.0002;

  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 10;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50000000;

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(86.925, 27.988, 5000),
    orientation: {
      pitch: Cesium.Math.toRadians(-20),
      heading: Cesium.Math.toRadians(0),
      roll: 0,
    },
  });

  viewer._cesiumWidget._creditContainer.style.display = 'none';

  if (accessToken) {
    const credit = document.createElement('div');
    credit.style.cssText = 'position:absolute;bottom:4px;right:4px;font-size:10px;color:#888;z-index:10';
    credit.textContent = 'Terrain: Cesium World Terrain | Imagery: Cesium World Imagery + Esri Streets';
    viewer.container.appendChild(credit);
  }

  const searchContainer = document.createElement('div');
  searchContainer.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:100;display:flex;gap:4px;';
  searchContainer.innerHTML = `
    <input type="text" id="search-input" placeholder="Search for a city..." style="width:300px;padding:8px 12px;border:1px solid #555;border-radius:4px;background:rgba(0,0,0,0.75);color:#fff;font-size:14px;outline:none;">
    <button id="search-btn" style="padding:8px 16px;border:none;border-radius:4px;background:#1976D2;color:#fff;font-size:14px;cursor:pointer;">Search</button>
  `;
  viewer.container.appendChild(searchContainer);

  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');

  async function searchCity(query) {
    if (!query.trim()) return;
    try {
      const res = await fetch(`/geocode/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const result = data[0];
        const lon = parseFloat(result.lon);
        const lat = parseFloat(result.lat);
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat, 10000),
          orientation: {
            pitch: Cesium.Math.toRadians(-20),
            heading: Cesium.Math.toRadians(0),
            roll: 0,
          },
        });
      }
    } catch (e) {
      console.error('Search failed:', e);
    }
  }

  searchBtn.addEventListener('click', () => searchCity(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchCity(searchInput.value);
  });
}

init();

import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './worldview.css';
import { mountWorldviewUI } from './worldview/ui.js';
import { SatelliteLayer } from './layers/satellites.js';
import { FlightLayer } from './layers/flights.js';
import { EarthquakeLayer } from './layers/earthquakes.js';
import { CctvLayer } from './layers/cctv.js';

async function init() {
  const accessToken = import.meta.env.VITE_CESIUM_TOKEN;
  if (accessToken) Cesium.Ion.defaultAccessToken = accessToken;

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
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  });

  viewer.useBrowserRecommendedResolution = false;
  viewer.resolutionScale = 0.85;
  viewer.scene.postProcessStages.fxaa.enabled = false;
  viewer._cesiumWidget._creditContainer.style.display = 'none';

  viewer.imageryLayers.removeAll();
  let imageryCredit = 'Satellite + map';
  try {
    if (accessToken) {
      viewer.imageryLayers.addImageryProvider(
        await Cesium.createWorldImageryAsync({
          style: Cesium.IonWorldImageryStyle.AERIAL,
        })
      );
      viewer.imageryLayers.addImageryProvider(
        await Cesium.createWorldImageryAsync({
          style: Cesium.IonWorldImageryStyle.ROAD,
        })
      );
      imageryCredit = 'Cesium Ion aerial + roads';
    } else {
      viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          maximumLevel: 19,
        })
      );
      const mapLayer = viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          maximumLevel: 19,
        })
      );
      mapLayer.alpha = 0.55;
      imageryCredit = 'Esri imagery + OSM';
    }
  } catch (e) {
    console.error('Imagery setup failed:', e);
  }

  const globe = viewer.scene.globe;
  globe.enableLighting = true;
  globe.showGroundAtmosphere = false;
  globe.depthTestAgainstTerrain = false;

  const controller = viewer.scene.screenSpaceCameraController;
  controller.enableTranslate = true;
  controller.enableLook = true;
  controller.enableRotate = true;
  controller.enableTilt = true;
  controller.enableZoom = true;
  controller.inertiaZoom = 0.2;
  controller.inertiaSpin = 0.9;
  controller.minimumZoomDistance = 2.0;
  controller.maximumZoomDistance = 50_000_000.0;

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-97.74, 30.27, 2_500_000),
    orientation: {
      pitch: Cesium.Math.toRadians(-40),
      heading: 0,
      roll: 0,
    },
  });

  const satelliteLayer = new SatelliteLayer(viewer);
  const liveFlights = new FlightLayer(viewer, { military: false });
  const militaryFlights = new FlightLayer(viewer, { military: true });
  const earthquakeLayer = new EarthquakeLayer(viewer);
  const cctvLayer = new CctvLayer(viewer);

  let demLoaded = false;
  let cctvLoaded = false;
  let panopticOn = true;
  satelliteLayer.setPanoptic(panopticOn);

  const ui = mountWorldviewUI(viewer, {
    onLoadDem: async () => {
      if (demLoaded) return;
      ui.setSummary('Loading terrain…');
      try {
        viewer.terrainProvider = await Cesium.createWorldTerrainAsync({
          requestWaterMask: true,
          requestVertexNormals: true,
        });
        globe.depthTestAgainstTerrain = true;
        globe.terrainExaggeration = 2.0;
        globe.maximumScreenSpaceError = 4.0;
        demLoaded = true;
        ui.setDemEnabled();
        ui.setSummary(`DEM on · ${imageryCredit}`);
        if (cctvLayer.visible) {
          await cctvLayer.reclampToTerrain();
        }
      } catch (e) {
        ui.setSummary(`DEM failed: ${e.message}`);
      }
    },
    onPanoptic: (on) => {
      panopticOn = on;
      satelliteLayer.setPanoptic(on);
    },
    onSearch: async (query) => {
      if (!query?.trim()) return;
      try {
        const res = await fetch(
          `/geocode/search?q=${encodeURIComponent(query)}&format=json&limit=1`
        );
        const data = await res.json();
        if (data?.[0]) {
          const lon = parseFloat(data[0].lon);
          const lat = parseFloat(data[0].lat);
          ui.setLocation(data[0].display_name?.split(',')[0] || query, query);
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, 120000),
            orientation: {
              pitch: Cesium.Math.toRadians(-35),
              heading: 0,
              roll: 0,
            },
          });
        }
      } catch (e) {
        console.error('Search failed:', e);
      }
    },
    onLayerToggle: async (layerId) => {
      const toggle = ui.overlay.querySelector(`[data-toggle="${layerId}"]`);
      const isOn = !toggle?.classList.contains('on');

      try {
        if (layerId === 'satellites') {
          if (isOn) {
            ui.setSummary('Loading TLE catalogs…');
            if (!satelliteLayer.loaded) {
              await satelliteLayer.load();
            }
            satelliteLayer.setVisible(true);
            satelliteLayer.setPanoptic(panopticOn);
            ui.setLayerCount('satellites', satelliteLayer.count);
          } else {
            satelliteLayer.setVisible(false);
          }
          ui.setLayerOn('satellites', isOn);
        }

        if (layerId === 'flights') {
          if (isOn) {
            await liveFlights.enable();
            ui.setLayerOn('flights', true);
          } else {
            liveFlights.disable();
            ui.setLayerOn('flights', false);
          }
          ui.setLayerCount('flights', liveFlights.count);
        }

        if (layerId === 'military') {
          if (isOn) {
            try {
              await militaryFlights.enable();
              ui.setLayerOn('military', true);
              const n = militaryFlights.count;
              ui.setLayerCount('military', n);
              ui.setSummary(
                n > 0
                  ? `Military · ${n} aircraft · ${militaryFlights._milFeedLabel}`
                  : 'Military layer on · no aircraft in feed right now'
              );
            } catch (e) {
              console.error('Military layer:', e);
              militaryFlights.disable();
              ui.setLayerOn('military', false);
              ui.setLayerCount('military', 0);
              ui.setSummary(
                `Military feed failed (adsb.lol / adsb.fi). Check network or retry. ${e.message}`
              );
            }
          } else {
            militaryFlights.disable();
            ui.setLayerOn('military', false);
          }
        }

        if (layerId === 'earthquakes') {
          if (isOn) {
            await earthquakeLayer.enable();
            ui.setLayerOn('earthquakes', true);
            ui.setLayerCount('earthquakes', earthquakeLayer.count);
          } else {
            earthquakeLayer.disable();
            ui.setLayerOn('earthquakes', false);
          }
        }

        if (layerId === 'cctv') {
          if (isOn) {
            ui.setSummary('Loading CCTV mesh…');
            if (!cctvLoaded) {
              const n = await cctvLayer.load((msg) => ui.setSummary(msg));
              cctvLoaded = true;
              ui.populateCctvSelect(cctvLayer.cameras, null);
              ui.setLayerCount('cctv', n);
            }
            cctvLayer.setVisible(true);
            ui.setLayerOn('cctv', true);
            const cc = cctvLayer.countryCount ?? '—';
            ui.setSummary(
              `CCTV mesh · ${cctvLayer.count} nodes · ${cc} countries`
            );
          } else {
            cctvLayer.setVisible(false);
            ui.setLayerOn('cctv', false);
            ui.setDetail(null);
            ui.stopCctvFeeds();
          }
        }
      } catch (e) {
        console.error(`Layer ${layerId}:`, e);
        ui.setSummary(`${layerId} failed: ${e.message}`);
        ui.setLayerOn(layerId, false);
      }
    },
    onCctvAction: (action) => {
      if (!cctvLayer.visible) return;
      let detail = null;
      if (action === 'nearest') detail = cctvLayer.selectNearest(viewer);
      if (action === 'prev') detail = cctvLayer.selectPrev();
      if (action === 'next') detail = cctvLayer.selectNext();
      if (detail) showCctvSelection(detail);
    },
    onCctvSelect: (id) => {
      const detail = cctvLayer.select(id);
      if (detail) showCctvSelection(detail);
    },
    onCctvCoverage: (on) => cctvLayer.setShowCoverage(on),
    onCctvProjection: (on) => cctvLayer.setShowProjection(on),
    onCctvCalibration: (patch) => {
      if (!cctvLayer.selectedId) return;
      cctvLayer.setCalibration(cctvLayer.selectedId, patch);
      const detail = cctvLayer.getDetails(cctvLayer.selectedId);
      if (detail) ui.setDetail(detail);
    },
  });

  function showCctvSelection(detail) {
    satelliteLayer.clearSelection();
    liveFlights.clearSelection();
    militaryFlights.clearSelection();
    ui.populateCctvSelect(cctvLayer.cameras, detail.camera.id);
    ui.syncCctvSliders(detail.calibration);
    ui.updateCctvPreview(detail);
    ui.setDetail(detail);
    ui.setSpyTrack(detail);
    ui.setLandmark(detail.camera.city, detail.title);
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        detail.camera.lon,
        detail.camera.lat,
        2500
      ),
      orientation: {
        pitch: Cesium.Math.toRadians(-35),
        heading: Cesium.Math.toRadians(detail.calibration.heading),
        roll: 0,
      },
      duration: 1.2,
    });
  }

  ui.setSummary(`No DEM · ${imageryCredit} · click object for intel panel`);

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((movement) => {
    const picked = viewer.scene.pick(movement.position);
    const entity = picked?.id;
    const eid = entity?.id ?? '';

    if (String(eid).startsWith('cctv-') && !String(eid).includes('cov')) {
      const camId = cctvLayer.resolveCamIdFromEntityId(eid);
      if (!camId) return;
      const detail = cctvLayer.select(camId);
      if (detail) showCctvSelection(detail);
      return;
    }

    if (String(eid).startsWith('sat-') && !String(eid).includes('path')) {
      const norad = eid.replace('sat-', '');
      liveFlights.clearSelection();
      militaryFlights.clearSelection();
      cctvLayer.clearSelection();
      ui.stopCctvFeeds();
      satelliteLayer.select(norad);
      const detail = satelliteLayer.getDetails(norad);
      if (detail) {
        ui.setDetail(detail);
        ui.setSpyTrack(detail);
        ui.setLandmark(detail.title, `NORAD ${detail.noradId}`);
        viewer.flyTo(entity, {
          duration: 1.2,
          offset: new Cesium.HeadingPitchRange(0, -0.4, 800000),
        });
      }
      return;
    }

    if (String(eid).startsWith('flight-') && !String(eid).includes('path')) {
      const icao = eid.replace('flight-', '');
      satelliteLayer.clearSelection();
      cctvLayer.clearSelection();
      ui.stopCctvFeeds();
      const layer = militaryFlights.byIcao.has(icao) ? militaryFlights : liveFlights;
      if (layer === liveFlights) militaryFlights.clearSelection();
      else liveFlights.clearSelection();

      layer.select(icao).then((detailFromSelect) => {
        const detail = detailFromSelect || layer.getDetails(icao);
        if (detail) {
          ui.setDetail(detail);
          ui.setSpyTrack(detail);
          ui.setLandmark(detail.title, detail.icao.toUpperCase());
          viewer.flyTo(entity, {
            duration: 1,
            offset: new Cesium.HeadingPitchRange(0, -0.3, 400000),
          });
        }
      });
      return;
    }

    satelliteLayer.clearSelection();
    liveFlights.clearSelection();
    militaryFlights.clearSelection();
    cctvLayer.clearSelection();
    ui.clearSpyTrack();
    ui.setDetail(null);
    ui.stopCctvFeeds();
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  handler.setInputAction(() => {
    satelliteLayer.clearSelection();
    liveFlights.clearSelection();
    militaryFlights.clearSelection();
    cctvLayer.clearSelection();
    ui.clearSpyTrack();
    ui.setDetail(null);
    ui.stopCctvFeeds();
  }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

  setInterval(() => {
    if (liveFlights.visible) ui.setLayerCount('flights', liveFlights.count);
    if (militaryFlights.visible) ui.setLayerCount('military', militaryFlights.count);
  }, 15000);
}

init();

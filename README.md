# RAYSpy

A cinematic, browser-based 3D globe with a live-intelligence HUD — orbit down from space to street level and pull real-time satellites, flights, earthquakes, and CCTV feeds along the way.

RAYSpy is a [CesiumJS](https://cesium.com/platform/cesiumjs/) globe wrapped in a holographic, "spy satellite" style dashboard. Scroll from orbital altitude down to street level and the scene progressively reveals 3D buildings, target-lock intel panels, and live data overlays sourced from public APIs — all rendered with a cyan tactical-HUD aesthetic.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Controls](#controls)
- [How the Zoom Pipeline Works](#how-the-zoom-pipeline-works)
- [Data Sources & Attribution](#data-sources--attribution)
- [Security Notes](#security-notes)
- [License](#license)

## Features

-Progressive zoom intelligence (HoloCity): camera altitude drives five distinct stages (Orbital → Regional → Transition → City → Street), each unlocking new geometry and UI: 3D OSM buildings fade in, roads/grids render, and a JARVIS-style "target lock" animation fires when you click a building.
-Holographic globe styling: custom atmosphere tinting, bloom, and scanline post-processing effects give the globe a sci-fi terminal look without recoloring the underlying satellite imagery.
-Live satellite tracking: TLE catalogs pulled from CelesTrak and propagated client-side with satellite.js, grouped by category (Stations, Weather, GPS, Galileo, Visual, Science) with a "panoptic" high-density mode.
-Live flight tracking: commercial air traffic plus a dedicated **military aircraft** overlay, pulling from adsb.lol / adsb.fi with automatic feed fallback.
-Real-time earthquakes: USGS's live GeoJSON feed, sized and colored by magnitude.
-Global CCTV mesh: a worldwide public-camera catalog (TfL London, City of Austin Mobility, and the Open Eagle Eye registry) with FOV wedges, coverage cones, and per-camera calibration sliders.
-Click-to-dive navigation: click anywhere on the globe to trigger an animated two-stage descent to street level, complete with a live HUD, reverse-geocoded street label, and a pulsing building highlight.
-Intel panel & street imagery: locked buildings open an intel panel that pulls the nearest Mapillary street-level image.
-Search & geocoding: jump anywhere on Earth via Nominatim-powered place search.
-Animated boot sequence: a terminal-style "SCAN → INIT → SYNC" boot screen plays before the dashboard reveals itself.

## Tech Stack
- [CesiumJS](https://cesium.com/platform/cesiumjs/): 3D globe rendering, terrain, and imagery
- [satellite.js](https://github.com/shashwatak/satellite-js): SGP4 orbit propagation from TLE data
- [Vite](https://vitejs.dev/): dev server & build tooling
- Vanilla JavaScript (ES modules): no framework; UI is hand-built DOM/CSS
- Node.js proxy server (proxy-server.mjs): routes browser requests to third-party APIs to avoid CORS/referrer issues
- [Playwright](https://playwright.dev/): used by the demo-capture script to generate screenshots/video

## Project Structure

RAYSpy-main/
├── index.html                # Entry HTML
├── proxy-server.mjs          # Local CORS-bypass proxy for external APIs
├── start-dev.mjs             # Runs proxy server + Vite together
├── vite.config.js            # Vite config + dev-server proxy rules
├── scripts/
│   ├── copy-cesium.js        # Copies Cesium static assets into /public
│   └── capture-demo.mjs      # Automated screenshot/video capture (Playwright)
├── public/
│   ├── assets/
│   └── cesium/                # Cesium runtime assets (Workers, Widgets, etc.)          
└── src/
    ├── main.js                # App entry point — Cesium viewer setup & event wiring
    ├── BootSequence.js         # Terminal-style boot animation
    ├── LoadingScreen.js
    ├── HoloGlobe3D.js          # Holographic orbital globe overlay
    ├── HoloCity.js             # Progressive zoom → 3D city intelligence system
    ├── core/
    │   ├── ZoomController.js   # Altitude → stage state machine
    │   ├── GlobeStyler.js
    │   └── TransitionController.js
    ├── city/                   # Grid / road / building renderers for city stage
    ├── intel/                  # Target-lock animation + intel side panel
    ├── providers/              # OSM (Overpass) + Mapillary data providers
    ├── effects/                # Bloom, scanline, atmosphere post-processing
    ├── layers/                 # Satellites, flights, earthquakes, CCTV overlays
    ├── data/                   # CCTV catalog + global camera registry
    ├── worldview/              # Dashboard UI, HUD, CCTV feed viewer
    └── worldview.css / landing.css

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- A free [Cesium ion](https://ion.cesium.com/signup) account (for global terrain, imagery, and 3D OSM buildings)

### Installation:

bash:
git clone https://github.com/<your-username>/RAYSpy.git
cd RAYSpy
npm install

### Configure environment variables

Copy the example file and fill in your own tokens:

bash:
cp .env.example .env

See [Environment Variables](#environment-variables) below for details.

### Run the dev server

bash:
npm run dev

This starts both the local API proxy (port 5176) and the Vite dev server (default port 5173). Open the printed local URL in your browser.
> Without a Cesium ion token, RAYSpy still runs — it falls back to Esri World Imagery + OpenStreetMap tiles and an ellipsoid terrain (no 3D buildings or high-res terrain).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| VITE_CESIUM_TOKEN | Recommended | Cesium ion access token. Enables world terrain, aerial imagery, and 3D OSM buildings. Get one free at [ion.cesium.com/signup](https://ion.cesium.com/signup). |
| VITE_MAPILLARY_TOKEN | Optional | Enables nearest street-level imagery lookups in the Intel panel. Without it, the app falls back to a Mapillary web deep-link. |

## Available Scripts

| Script | Description |
|---|---|
| npm run dev | Copies Cesium assets, then starts the proxy server and Vite dev server together |
| npm run build | Copies Cesium assets and builds a production bundle to dist/ |
| npm run preview | Serves the production build locally |
| npm run copy-cesium | Copies Cesium's static Workers/Assets/Widgets into public/cesium (runs automatically before dev/build) |

## Controls

- Scroll: zoom in/out (drives the Orbital → Street stage transitions)
- Left-click drag: rotate/pan the camera
- Left-click(on empty globe): animated dive to street level at that point
- Left-click(on a satellite / flight / CCTV marker): select it and open its detail card
- Double-click: fly back out to orbital view
- Search bar: fly to any place name or address
- Layer toggles: enable/disable Satellites, Flights, Military, Earthquakes, and CCTV overlays from the dashboard

## How the Zoom Pipeline Works

`ZoomController` watches camera altitude on every frame and classifies it into one of five stages, which `HoloCity` uses to progressively reveal geometry and UI:

| Stage | Altitude | What happens |
|---|---|---|
| Orbital | > 500,000 m | Holographic globe overlay, satellites, global layers |
| Regional | 80,000 – 500,000 m | Regional context, coarse terrain |
| Transition | 8,000 – 80,000 m | Grid/road overlays begin rendering |
| City | 600 – 8,000 m | 3D OSM buildings revealed, building picking enabled |
| Street | < 600 m | Street-level label, target-lock + Intel panel interactions |

## Data Sources & Attribution

RAYSpy is a visualization layer over publicly available data and imagery. It doesn't host or generate any of the underlying feeds:

- Cesium ion: global terrain, aerial imagery, 3D OSM buildings
- [CelesTrak](https://celestrak.org/): satellite TLE catalogs
- [adsb.lol](https://adsb.lol/) / [adsb.fi](https://adsb.fi/): live ADS-B flight data
- [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/): real-time earthquake feed
- [OpenStreetMap](https://www.openstreetmap.org/) / [Nominatim](https://nominatim.org/): geocoding, roads, and building footprints (Overpass API)
- [Mapillary](https://www.mapillary.com/): street-level imagery
- [Transport for London](https://tfl.gov.uk/), [City of Austin Mobility](https://data.mobility.austin.gov/), and the [Open Eagle Eye](https://github.com/stuchapin909/Open-Eagle-Eye) registry: public traffic camera feeds

Please respect each provider's terms of use and rate limits if you extend or redeploy this project.

No license has been specified yet. Consider adding an [MIT](https://choosealicense.com/licenses/mit/) (or similar) LICENSE file if you intend for others to use or contribute to this project.

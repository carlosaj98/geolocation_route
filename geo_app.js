// Cambia esta constante:
// true  -> usa una ruta simulada
// false -> usa ubicación real
const SIMULATION_MODE = false;

let map;
let userMarker;
let pathPolyline;
let pathLatLngs = [];

// Real tracking
let watchId = null;

// Simulated tracking
let simulationIntervalId = null;
let simulationIndex = 0;

// UI elements
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const modeLabelEl = document.getElementById("modeLabel");

// Sample simulated route (Madrid area)
const simulatedRoute = [
  { lat: 40.41680, lng: -3.70380 },
  { lat: 40.41710, lng: -3.70310 },
  { lat: 40.41740, lng: -3.70240 },
  { lat: 40.41780, lng: -3.70180 },
  { lat: 40.41820, lng: -3.70120 },
  { lat: 40.41860, lng: -3.70060 },
  { lat: 40.41900, lng: -3.70010 }
];

function setStatus(text) {
  statusEl.textContent = text;
}

function setModeLabel() {
  modeLabelEl.textContent =
    SIMULATION_MODE ? "Modo: simulación de ruta" : "Modo: geolocalización real";
}

function getInitialPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation || SIMULATION_MODE) {
      // Si no hay geolocalización o estamos simulando, usar fallback
      resolve({ lat: 40.4168, lng: -3.7038 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      () => {
        // Error o permiso denegado → fallback
        resolve({ lat: 40.4168, lng: -3.7038 });
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  });
}


// ---- MAPA ----
async function initMap() {
  const initialPos = await getInitialPosition();

  map = L.map("map").setView([initialPos.lat, initialPos.lng], 18);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  pathPolyline = L.polyline([], { weight: 5, opacity: 0.8 }).addTo(map);

  setModeLabel();
}


// ---- EVENTO PARA CADA POSICIÓN ----
function handlePosition(position) {
  const { latitude, longitude, accuracy } = position.coords;
  const latLng = [latitude, longitude];

  pathLatLngs.push(latLng);
  pathPolyline.setLatLngs(pathLatLngs);

  if (!userMarker) {
    userMarker = L.circleMarker(latLng, {
      radius: 7,
      weight: 2
    }).addTo(map);
  } else {
    userMarker.setLatLng(latLng);
  }

  map.setView(latLng, map.getZoom());

  setStatus(
    `Última posición: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(
      accuracy
    )} m)`
  );
}

function handleError(error) {
  const msg = {
    1: "Permiso de ubicación denegado.",
    2: "La ubicación no está disponible.",
    3: "Tiempo de espera agotado."
  }[error.code] || "Error desconocido al obtener la ubicación.";

  setStatus(msg);
}

// ---- MODO REAL ----
function startRealTracking() {
  if (!navigator.geolocation) {
    setStatus("Geolocalización no soportada en este navegador.");
    return;
  }

  setStatus("Solicitando permiso de ubicación…");

  watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
    enableHighAccuracy: false,
    maximumAge: 0,
    timeout: 10000
  });
}

function stopRealTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    setStatus("Seguimiento detenido.");
  }
}

// ---- MODO SIMULACIÓN ----
function startSimulation() {
  setStatus("Iniciando simulación…");
  simulationIndex = 0;

  simulationIntervalId = setInterval(() => {
    if (simulationIndex >= simulatedRoute.length) simulationIndex = 0;

    const point = simulatedRoute[simulationIndex++];
    const fakePos = {
      coords: {
        latitude: point.lat,
        longitude: point.lng,
        accuracy: 5
      },
      timestamp: Date.now()
    };

    handlePosition(fakePos);
  }, 2000);
}

function stopSimulation() {
  if (simulationIntervalId !== null) {
    clearInterval(simulationIntervalId);
    simulationIntervalId = null;
    setStatus("Simulación detenida.");
  }
}

// ---- CONTROLES ----
function startTracking() {
  pathLatLngs = [];
  pathPolyline.setLatLngs(pathLatLngs);

  if (userMarker) {
    userMarker.remove();
    userMarker = null;
  }

  if (SIMULATION_MODE) startSimulation();
  else startRealTracking();

  startBtn.disabled = true;
  stopBtn.disabled = false;
}

function stopTracking() {
  if (SIMULATION_MODE) stopSimulation();
  else stopRealTracking();

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

startBtn.addEventListener("click", startTracking);
stopBtn.addEventListener("click", stopTracking);

initMap();

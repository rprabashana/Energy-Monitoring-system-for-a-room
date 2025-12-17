// app.js - simulated energy monitoring for a room
// Live power + energy graphs, with optional close/hide controls

const costPerKWh = 0.20; // adjust for your currency
const sampleIntervalMs = 1000;
const maxSamples = 60;

const devices = {
  light1: {name:'Light 1', power:10, on:false},
  light2: {name:'Light 2', power:10, on:false},
  fan: {name:'Fan', power:75, on:false},
  ac: {name:'AC', power:1200, on:false},
  heater: {name:'Heater', power:1500, on:false},
  wall1: {name:'Wall Plug 1', power:100, on:false},
  wall2: {name:'Wall Plug 2', power:100, on:false}
};

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAYXitQZL0L20k6zi-Fpp0uqQSlzXglKOo",
  authDomain: "energy-monitoring-for-room.firebaseapp.com",
  databaseURL: "https://energy-monitoring-for-room-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "energy-monitoring-for-room",
  storageBucket: "energy-monitoring-for-room.firebasestorage.app",
  messagingSenderId: "454113712026",
  appId: "1:454113712026:web:191de55bd211b20cdd0c23"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Sign in anonymously
firebase.auth().signInAnonymously().then(() => {
  console.log('Signed in anonymously');
  // Load initial device states from Firebase
  Object.keys(devices).forEach(key => {
    database.ref('devices/' + key + '/on').once('value').then(snapshot => {
      devices[key].on = snapshot.val() || false;
      syncUI();
    });
  });
}).catch((error) => {
  console.error('Auth error:', error);
});

// State
let energyTodayWh = 0; // accumulate watt-hours
let lastTimestamp = Date.now();
let samples = []; // {t, powerW}
let energySeries = []; // cumulative kWh samples aligned with `samples`

// DOM (may be missing on some pages)
const currentPowerEl = document.getElementById('currentPower');
const energyTodayEl = document.getElementById('energyToday');
const costTodayEl = document.getElementById('costToday');
const historyTbody = document.querySelector('#historyTable tbody');

// Setup device buttons
document.querySelectorAll('.device').forEach(btn=>{
  const key = btn.dataset.device;
  btn.addEventListener('click', ()=>{
    devices[key].on = !devices[key].on;
    btn.classList.toggle('active', devices[key].on);
    // Send to Firebase
    database.ref('devices/' + key + '/on').set(devices[key].on);
  });
});

// Chart.js instances (create only if corresponding canvas exists)
let powerChart = null;
let energyChart = null;
const powerCanvas = document.getElementById('powerChart');
const energyCanvas = document.getElementById('energyChart');

if (powerCanvas) {
  const ctx = powerCanvas.getContext('2d');
  powerChart = new Chart(ctx, {
    type:'line',
    data:{
      labels: Array(maxSamples).fill(''),
      datasets:[{
        label:'Power (W)',
        data: Array(maxSamples).fill(null),
        borderColor: '#45aaf2',
        backgroundColor: 'rgba(69,170,242,0.12)',
        tension:0.2,
        spanGaps:true,
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      scales:{ x:{display:false}, y:{beginAtZero:true} },
      plugins:{legend:{display:false}}
    }
  });
}

if (energyCanvas) {
  const ctx2 = energyCanvas.getContext('2d');
  energyChart = new Chart(ctx2, {
    type:'line',
    data:{
      labels: Array(maxSamples).fill(''),
      datasets:[{
        label:'Energy (kWh)',
        data: Array(maxSamples).fill(null),
        borderColor: '#2ecc71',
        backgroundColor: 'rgba(46,204,113,0.10)',
        tension:0.2,
        spanGaps:true,
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      scales:{ x:{display:false}, y:{beginAtZero:true} },
      plugins:{legend:{display:false}}
    }
  });
}

function simulatePower() {
  // baseline ambient load (appliances, idle electronics)
  const ambient = 30 + Math.random() * 20; // W

  // device load
  let deviceLoad = 0;
  for (const k in devices) if (devices[k].on) deviceLoad += devices[k].power;

  // occasional fluctuations
  const noise = (Math.random()-0.5) * 12;

  const powerW = Math.max(0, Math.round(ambient + deviceLoad + noise));
  return powerW;
}

function addSample(powerW) {
  const t = new Date();
  samples.push({t, powerW});
  if (samples.length > maxSamples) samples.shift();
  // keep energySeries aligned
  const energyKWh = energyTodayWh / 1000; // current cumulative value
  energySeries.push(+(energyKWh.toFixed(6)));
  if (energySeries.length > maxSamples) energySeries.shift();
}

function updateUI(powerW, deltaWh) {
  if (currentPowerEl) currentPowerEl.textContent = `${powerW} W`;
  energyTodayWh += deltaWh; // delta in Wh
  const energyKWh = energyTodayWh / 1000;
  if (energyTodayEl) energyTodayEl.textContent = `${energyKWh.toFixed(3)} kWh`;
  if (costTodayEl) costTodayEl.textContent = `$${(energyKWh * costPerKWh).toFixed(2)}`;

  // update power chart
  if (powerChart) {
    const ds = powerChart.data.datasets[0].data;
    ds.push(powerW);
    if (ds.length > maxSamples) ds.shift();
    powerChart.data.labels = samples.map(s=>s.t.toLocaleTimeString());
    // only update if parent is visible
    const parent = document.getElementById('powerCard');
    if (!parent || !parent.classList.contains('hidden')) powerChart.update('none');
  }

  // update energy chart (cumulative kWh series)
  if (energyChart) {
    const ed = energyChart.data.datasets[0].data;
    ed.push(+(energyKWh.toFixed(6)));
    if (ed.length > maxSamples) ed.shift();
    energyChart.data.labels = samples.map(s=>s.t.toLocaleTimeString());
    const parentE = document.getElementById('energyCard');
    if (!parentE || !parentE.classList.contains('hidden')) energyChart.update('none');
  }

  // update history table (show last 6 readings)
  if (historyTbody) {
    historyTbody.innerHTML = '';
    const recent = samples.slice(-6).reverse();
    for (const s of recent) {
      const tr = document.createElement('tr');
      const tdTime = document.createElement('td'); tdTime.textContent = s.t.toLocaleTimeString();
      const tdPower = document.createElement('td'); tdPower.textContent = `${s.powerW} W`;
      const tdEnergy = document.createElement('td');
      // approximate kWh per reading (sampleIntervalMs)
      const kWh = (s.powerW * (sampleIntervalMs/1000/3600));
      tdEnergy.textContent = `${kWh.toFixed(4)}`;
      tr.appendChild(tdTime); tr.appendChild(tdPower); tr.appendChild(tdEnergy);
      historyTbody.appendChild(tr);
    }
  }
}

// Close/show graph buttons
document.querySelectorAll('.close-graph').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const target = document.querySelector(btn.dataset.target);
    if (!target) return;
    target.classList.toggle('hidden');
    btn.textContent = target.classList.contains('hidden') ? 'Show' : 'Close';
  });
});

// Device panel open/close (floating rounded button)
const deviceAccessBtn = document.querySelector('.device-access');
const devicePanel = document.getElementById('devicePanel');
if (deviceAccessBtn && devicePanel) {
  function openDevicePanel(open){
    if (open) {
      devicePanel.classList.remove('hidden');
      devicePanel.setAttribute('aria-hidden','false');
    } else {
      devicePanel.classList.add('hidden');
      devicePanel.setAttribute('aria-hidden','true');
    }
  }
  deviceAccessBtn.addEventListener('click', (e)=>{ e.stopPropagation(); openDevicePanel(true); });
  // close X button
  document.querySelectorAll('.close-panel').forEach(b=>b.addEventListener('click', ()=>openDevicePanel(false)));
  // close when clicking outside
  document.addEventListener('click', (ev)=>{
    if (!devicePanel || devicePanel.classList.contains('hidden')) return;
    if (!devicePanel.contains(ev.target) && !deviceAccessBtn.contains(ev.target)) openDevicePanel(false);
  });
}

// Sync UI elements (buttons) with devices state
function syncUI(){
  // device toggles (dashboard) - elements with class 'device' and data-device
  document.querySelectorAll('[data-device]').forEach(el=>{
    const key = el.dataset.device;
    if (!key || !devices[key]) return;
    const isOn = !!devices[key].on;
    if (el.classList.contains('device')) el.classList.toggle('active', isOn);
    if (el.classList.contains('device-action')) {
      const action = el.dataset.action;
      if (action === 'on') el.classList.toggle('active', isOn);
      if (action === 'off') el.classList.toggle('active', !isOn);
    }
  });
}

// Wire up explicit on/off buttons in the device panel
document.addEventListener('click', (ev)=>{
  const btn = ev.target.closest && ev.target.closest('.device-action');
  if (!btn) return;
  const key = btn.dataset.device;
  const action = btn.dataset.action;
  if (!key || !devices[key]) return;
  devices[key].on = (action === 'on');
  syncUI();
  // Send to Firebase
  database.ref('devices/' + key + '/on').set(devices[key].on);
});

// Initial sync (in case controls are present at load)
setTimeout(syncUI, 200);

// Top-left menu toggle
const menuButton = document.querySelector('.menu-dots');
const topLeftMenu = document.querySelector('.top-left-menu');
if (menuButton && topLeftMenu) {
  function setMenuOpen(open){
    if (open) {
      topLeftMenu.classList.add('open');
      menuButton.setAttribute('aria-expanded','true');
      topLeftMenu.setAttribute('aria-hidden','false');
    } else {
      topLeftMenu.classList.remove('open');
      menuButton.setAttribute('aria-expanded','false');
      topLeftMenu.setAttribute('aria-hidden','true');
    }
  }

  menuButton.addEventListener('click', (e)=>{
    e.stopPropagation();
    setMenuOpen(!topLeftMenu.classList.contains('open'));
  });

  // close when clicking outside
  document.addEventListener('click', (ev)=>{
    if (!topLeftMenu.classList.contains('open')) return;
    const target = ev.target;
    if (!topLeftMenu.contains(target) && !menuButton.contains(target)) setMenuOpen(false);
  });

  // close on Escape
  document.addEventListener('keydown', (ev)=>{ if (ev.key === 'Escape') setMenuOpen(false); });
}

// Main loop
setInterval(()=>{
  const now = Date.now();
  const dtSec = (now - lastTimestamp)/1000;
  lastTimestamp = now;

  const powerW = simulatePower();
  // delta energy in Wh = power(W) * dt(h) = power * dtSec/3600
  const deltaWh = powerW * (dtSec/3600);
  // update cumulative series BEFORE pushing to energySeries so it represents post-sample cumulative
  energyTodayWh += 0; // ensure defined
  addSample(powerW);
  updateUI(powerW, deltaWh);
}, sampleIntervalMs);

// Expose for console quick checks
window.__ems = {devices, samples, energySeries, powerChart, energyChart};

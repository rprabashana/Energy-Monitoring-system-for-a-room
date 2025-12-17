Room Energy Management — Demo Dashboard

What this is

- A static, single-page dashboard that simulates live energy monitoring for a room.
- Shows "Current Power", "Energy Today" (accumulating), estimated cost, a live chart, and device toggles.

Files

- index.html — main dashboard (open in browser)
- styles.css — styling
- app.js — simulation logic, Chart.js wiring

How to run

1. Open `index.html` in your browser (double-click or use "Open with" in your OS).
2. The page uses simulated data and will update once per second.
3. Toggle devices (Light, AC, Heater) to see their effect on power and accumulated energy.

Customize

- Edit `costPerKWh` in `app.js` to set your electricity price.
- Replace the simulation in `app.js` with real sensor data (fetch from an API or local WebSocket). The `updateUI()` function handles display and chart updates.

Notes

This is a demo front-end only. For a production system you'd add:
- Backend that collects real sensor readings and stores history
- Authentication and multi-room support
- Persistence of daily energy totals and billing periods

Enjoy! If you want, I can add a mock API server or switch the chart to show hourly/daily aggregates next.
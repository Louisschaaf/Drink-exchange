const API = "/api";

// Variables to hold our graph data
let charts = {};     // Holds all our individual chart instances
let chartData = {};  // Holds the price history arrays
let chartLabels = {}; // Per-drink time labels
let visibilityConfig = {};

function safeDrinkId(drinkName) {
  return drinkName.replace(/\s+/g, '-');
}

function isDrinkVisible(drinkName) {
  if (typeof visibilityConfig[drinkName] === "boolean") {
    return visibilityConfig[drinkName];
  }
  return true;
}

function applyDrinkVisibility(drinkName) {
  const safeId = safeDrinkId(drinkName);
  const terminal = document.getElementById(`terminal-${safeId}`);
  if (!terminal) return;
  terminal.style.display = isDrinkVisible(drinkName) ? "flex" : "none";
}

// Function to generate a terminal dynamically
function createTerminal(drinkName, initialPrice) {
  const container = document.getElementById('terminals-container');
  
  // Create a safe ID string (e.g., "witte wijn" becomes "witte-wijn")
  const safeId = safeDrinkId(drinkName);

  // Build the HTML structure
  const terminal = document.createElement('div');
  terminal.className = 'terminal';
  terminal.id = `terminal-${safeId}`;
  
  terminal.innerHTML = `
    <h2>${drinkName}</h2>
    <div id="price-${safeId}" class="price-display price-flat">€${initialPrice.toFixed(2)}</div>
    <div><canvas id="chart-${safeId}"></canvas></div>
  `;
  container.appendChild(terminal);

  // Initialize the Chart.js graph for this specific terminal
  const ctx = document.getElementById(`chart-${safeId}`).getContext('2d');
  charts[drinkName] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels[drinkName],
      datasets: [{
        data: chartData[drinkName],
        borderWidth: 3,
        tension: 0.1,
        // THIS IS THE MAGIC: It colors the line based on the trend!
        segment: {
          borderColor: ctx => {
            if (ctx.p0.parsed.y > ctx.p1.parsed.y) return '#ff4444'; // Dropping = Red
            if (ctx.p0.parsed.y < ctx.p1.parsed.y) return '#00C851'; // Rising = Green
            return '#ffffff'; // Flat = White
          }
        }
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 0 }, // Disabled to prevent segment color flickering
      plugins: { legend: { display: false } }, // Hide the legend
      scales: {
        x: { display: false }, // Hide the time axis for a cleaner look
        y: { 
          ticks: { color: '#888' },
          grid: { color: '#333' }
        }
      }
    }
  });

  applyDrinkVisibility(drinkName);
}

async function loadPrices() {
  const res = await fetch("/api/prices");
  const data = await res.json();
  
  const prices = data.prices;
  visibilityConfig = data.config?.visibleDrinks || visibilityConfig;
  const nowLabel = new Date().toLocaleTimeString();

  for (const drink in prices) {
    const currentPrice = prices[drink].price;

    // 1. If we haven't seen this drink yet, set it up!
    if (!chartData[drink]) {
      chartData[drink] = [];
      chartLabels[drink] = [];
      createTerminal(drink, currentPrice);
    }

    // 2. Check the trend (Up, Down, or Flat)
    const priceEl = document.getElementById(`price-${safeDrinkId(drink)}`);
    let prevPrice = chartData[drink].length > 0 ? chartData[drink][chartData[drink].length - 1] : currentPrice;

    // Update grafiek alleen bij prijsverschil (of eerste datapunt).
    const hasChanged = chartData[drink].length === 0 || currentPrice !== prevPrice;
    if (hasChanged) {
      chartData[drink].push(currentPrice);
      chartLabels[drink].push(nowLabel);

      if (chartData[drink].length > 20) chartData[drink].shift();
      if (chartLabels[drink].length > 20) chartLabels[drink].shift();

      priceEl.innerText = `€${currentPrice.toFixed(2)}`;
      if (chartData[drink].length === 1) {
        priceEl.className = 'price-display price-flat';
      } else if (currentPrice > prevPrice) {
        priceEl.className = 'price-display price-up';
      } else {
        priceEl.className = 'price-display price-down';
      }

      charts[drink].update();
    }

    applyDrinkVisibility(drink);
  }
}

async function orderDrink(drink) {
  await fetch(API + "/order", {
    method: "POST",
    body: JSON.stringify({ drink })
  });
  loadPrices(); // Instantly update frontend
}

// Genereer de QR code voor de huidige pagina
const currentUrl = window.location.href;
document.getElementById('qr-code').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}`;

// Start everything up
loadPrices();
setInterval(loadPrices, 3000); // Fetch new prices every 3 seconds
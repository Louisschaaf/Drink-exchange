const API = "/api";

// Variables to hold our graph data
let charts = {};     // Holds all our individual chart instances
let chartData = {};  // Holds the price history arrays
let timeLabels = []; // The shared X-axis (time)

// Function to generate a terminal dynamically
function createTerminal(drinkName, initialPrice) {
  const container = document.getElementById('terminals-container');
  
  // Create a safe ID string (e.g., "witte wijn" becomes "witte-wijn")
  const safeId = drinkName.replace(/\s+/g, '-');

  // Build the HTML structure
  const terminal = document.createElement('div');
  terminal.className = 'terminal';
  
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
      labels: timeLabels,
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
}

async function loadPrices() {
  const res = await fetch("/api/prices");
  const data = await res.json();
  
  const prices = data.prices;
  const sold = data.drinksSold; // Nieuw!
  
  // --- Update Progress Bar ---
  const crashLimit = 50;
  const percentage = (sold / crashLimit) * 100;
  
  const bar = document.getElementById('crash-bar');
  const container = document.querySelector('.crash-container');
  const title = document.getElementById('crash-title');
  
  bar.style.width = percentage + '%';

  if (sold >= 40) {
    container.classList.add('danger-zone');
    title.innerText = "🚨 CRASH IMMINENT! 🚨";
  } else {
    container.classList.remove('danger-zone');
    title.innerText = "Beurscrash in aantocht... 📉";
  }

  // Update time tracker
  const now = new Date();
  timeLabels.push(now.toLocaleTimeString());
  if (timeLabels.length > 20) timeLabels.shift();

  for (const drink in data) {
    const currentPrice = data[drink].price;

    // 1. If we haven't seen this drink yet, set it up!
    if (!chartData[drink]) {
      chartData[drink] = [];
      createTerminal(drink, currentPrice);
    }

    // 2. Check the trend (Up, Down, or Flat)
    const priceEl = document.getElementById(`price-${drink.replace(/\s+/g, '-')}`);
    let prevPrice = chartData[drink].length > 0 ? chartData[drink][chartData[drink].length - 1] : currentPrice;
    
    // Update text color
    priceEl.innerText = `€${currentPrice.toFixed(2)}`;
    if (currentPrice > prevPrice) {
      priceEl.className = 'price-display price-up';
    } else if (currentPrice < prevPrice) {
      priceEl.className = 'price-display price-down';
    } else {
      priceEl.className = 'price-display price-flat';
    }

    // 3. Add new data to the graph
    chartData[drink].push(currentPrice);
    if (chartData[drink].length > 20) chartData[drink].shift();

    // 4. Redraw this specific graph
    charts[drink].update();
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
setInterval(loadPrices, 5000); // Fetch new prices every 5 seconds
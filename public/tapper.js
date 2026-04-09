let selectedDrink = "";
let currentQuantity = 1;
let myPin = ""; // Hier slaan we de PIN op

// Config instellingen
let config = {
  basePrice: {
    water: 2.00,
    alcohol: 4.00
  },
  priceIncrement: 0.014,
  priceJumpSize: 0.10,
  maxMultiplier: 1.50,
  minMultiplier: 0.50,
  decayInterval: 5000
};

function normalizeJumpSize(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.10;
  return Math.max(0.10, Math.round(numeric * 10) / 10);
}

// Login Functie
function loginTapper() {
  myPin = document.getElementById('pin-input').value;
  if(myPin === "") return alert("Vul een PIN in!");
  
  // Verberg het login scherm
  document.getElementById('login-screen').style.display = 'none';
}

function openModal(drinkName, icon) {
  selectedDrink = drinkName;
  currentQuantity = 1;
  document.getElementById('modal-title').innerText = `${icon} ${drinkName.toUpperCase()}`;
  document.getElementById('qty-display').innerText = currentQuantity;
  updateModalTotal();
  document.getElementById('quantity-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('quantity-modal').style.display = 'none';
}

function changeQuantity(amount) {
  currentQuantity += amount;
  if (currentQuantity < 1) currentQuantity = 1; 
  if (currentQuantity > 20) currentQuantity = 20; 
  document.getElementById('qty-display').innerText = currentQuantity;
}

async function confirmOrder() {
  closeModal();
  
  // Stuur de bestelling + de PIN naar de backend
  const response = await fetch("/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      drink: selectedDrink, 
      quantity: currentQuantity,
      pin: myPin // De beveiliging!
    })
  });

  // Als de PIN fout is, zal de backend een fout geven
  if (!response.ok) {
    alert("Fout bij bestelling! Is je PIN code juist?");
    document.getElementById('login-screen').style.display = 'flex'; // Toon login opnieuw
  } else {
    console.log(`Verkocht: ${currentQuantity}x ${selectedDrink}`);
  }
}

// --- NIEUWE LOGICA VOOR DE LIVE PRIJZEN ---

let currentPrices = {};

// Haal de prijzen elke 3 seconden op
async function fetchLivePrices() {
  try {
    const res = await fetch("/api/prices");
    const data = await res.json();
    currentPrices = data.prices; // Update onze globale prijzen
    
    // Bouw de HTML voor de zijbalk
    let listHTML = "";
    for (const drink in currentPrices) {
      listHTML += `
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding: 10px 0;">
          <span style="text-transform: capitalize;">${drink}</span>
          <strong style="color: #00C851;">€${currentPrices[drink].price.toFixed(2)}</strong>
        </div>
      `;
    }
    document.getElementById('live-price-list').innerHTML = listHTML;

    // Update ook de totaalprijs als de pop-up open staat
    updateModalTotal();

  } catch (err) {
    console.error("Fout bij ophalen prijzen:", err);
  }
}

function updateModalTotal() {
  if (selectedDrink && currentPrices[selectedDrink]) {
    const total = currentPrices[selectedDrink].price * currentQuantity;
    document.getElementById('modal-total').innerText = `Te betalen: €${total.toFixed(2)}`;
  }
}

// Zorg dat de totaalprijs update als je op de + of - knop klikt
const originalChangeQuantity = changeQuantity;
changeQuantity = function(amount) {
  originalChangeQuantity(amount);
  updateModalTotal();
};

// Start de loop voor de prijzen
fetchLivePrices();
setInterval(fetchLivePrices, 3000);

// Load config on page load
loadConfigPanel();

// --- CONFIG PANEL FUNCTIONALITEIT ---

function toggleConfigPanel(forceOpen = null) {
  const overlay = document.getElementById('config-overlay');
  const shouldOpen = forceOpen === null ? !overlay.classList.contains('open') : forceOpen;

  if (shouldOpen) {
    overlay.classList.add('open');
    loadConfigPanel();
  } else {
    overlay.classList.remove('open');
  }
}

function closeConfigPanel(event) {
  if (event.target.id === 'config-overlay') {
    toggleConfigPanel(false);
  }
}

async function loadConfigPanel() {
  try {
    const res = await fetch("/api/config");
    const data = await res.json();
    
    if (data.config) {
      config = data.config;
      
      // Vul de formulier in
      document.getElementById('config-base-water').value = config.basePrice?.water || 2.00;
      document.getElementById('config-base-alcohol').value = config.basePrice?.alcohol || 4.00;
      document.getElementById('config-price-increment').value = (config.priceIncrement * 100).toFixed(2);
      document.getElementById('config-price-jump-size').value = (config.priceJumpSize || 0.10).toFixed(2);
      document.getElementById('config-max-multiplier').value = config.maxMultiplier || 1.50;
      document.getElementById('config-min-multiplier').value = config.minMultiplier || 0.50;
      document.getElementById('config-decay-interval').value = config.decayInterval || 5000;
    }
  } catch (err) {
    console.error("Fout bij laden config:", err);
    populateDefaultConfig();
  }
}

function populateDefaultConfig() {
  document.getElementById('config-base-water').value = 2.00;
  document.getElementById('config-base-alcohol').value = 4.00;
  document.getElementById('config-price-increment').value = 1.40;
  document.getElementById('config-price-jump-size').value = 0.10;
  document.getElementById('config-max-multiplier').value = 1.50;
  document.getElementById('config-min-multiplier').value = 0.50;
  document.getElementById('config-decay-interval').value = 5000;
}

async function saveConfigPanel() {
  const baseWater = parseFloat(document.getElementById('config-base-water').value);
  const baseAlcohol = parseFloat(document.getElementById('config-base-alcohol').value);
  const priceIncrement = parseFloat(document.getElementById('config-price-increment').value) / 100;
  const priceJumpSize = normalizeJumpSize(parseFloat(document.getElementById('config-price-jump-size').value));
  const maxMultiplier = parseFloat(document.getElementById('config-max-multiplier').value);
  const minMultiplier = parseFloat(document.getElementById('config-min-multiplier').value);
  const decayInterval = parseInt(document.getElementById('config-decay-interval').value);

  // Validatie
  if (isNaN(baseWater) || isNaN(baseAlcohol) || isNaN(priceIncrement) || isNaN(priceJumpSize) || isNaN(maxMultiplier) || isNaN(minMultiplier) || isNaN(decayInterval)) {
    alert("Vul alle velden correct in!");
    return;
  }

  document.getElementById('config-price-jump-size').value = priceJumpSize.toFixed(2);

  const newConfig = {
    basePrice: {
      water: baseWater,
      alcohol: baseAlcohol
    },
    priceIncrement: priceIncrement,
    priceJumpSize: priceJumpSize,
    maxMultiplier: maxMultiplier,
    minMultiplier: minMultiplier,
    decayInterval: decayInterval
  };

  try {
    const response = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: newConfig, pin: myPin })
    });

    if (!response.ok) {
      alert("Fout bij opslaan config! Is je PIN correct?");
    } else {
      config = newConfig;
      alert("Config opgeslagen!");
      toggleConfigPanel();
    }
  } catch (err) {
    console.error("Fout bij opslaan config:", err);
    alert("Fout bij opslaan config");
  }
}

function resetConfigPanel() {
  if (confirm("Instellingen naar standaarden terugzetten?")) {
    populateDefaultConfig();
  }
}

// --- ADMIN FUNCTIES ---

async function adminResetPrices() {
  if (!confirm("Alle prijzen resetten naar normale waarden?")) return;

  try {
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_prices", pin: myPin })
    });

    if (!response.ok) {
      alert("Fout! Is je PIN correct?");
    } else {
      alert("Prijzen gereset!");
      fetchLivePrices();
    }
  } catch (err) {
    console.error("Fout bij admin actie:", err);
    alert("Fout bij admin actie");
  }
}

async function adminPriceJumpUp() {
  if (!confirm("Alle prijzen omhoog springen?")) return;

  try {
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "price_jump_up", pin: myPin })
    });

    if (!response.ok) {
      alert("Fout! Is je PIN correct?");
    } else {
      alert("Prijzen omhoog!");
      fetchLivePrices();
    }
  } catch (err) {
    console.error("Fout bij admin actie:", err);
    alert("Fout bij admin actie");
  }
}

async function adminPriceJumpDown() {
  if (!confirm("Alle prijzen omlaag springen?")) return;

  try {
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "price_jump_down", pin: myPin })
    });

    if (!response.ok) {
      alert("Fout! Is je PIN correct?");
    } else {
      alert("Prijzen omlaag!");
      fetchLivePrices();
    }
  } catch (err) {
    console.error("Fout bij admin actie:", err);
    alert("Fout bij admin actie");
  }
}
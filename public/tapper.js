let selectedDrink = "";
let currentQuantity = 1;
let myPin = ""; // Hier slaan we de PIN op
let cart = {};

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
  myPin = document.getElementById('pin-input').value.trim();
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
  if (!selectedDrink) return;

  cart[selectedDrink] = (cart[selectedDrink] || 0) + currentQuantity;
  renderCart();
  closeModal();
}

function calculateCartTotal() {
  let total = 0;
  for (const drink in cart) {
    const qty = cart[drink];
    const price = currentPrices[drink]?.price || 0;
    total += qty * price;
  }
  return total;
}

function renderCart() {
  const cartList = document.getElementById('cart-list');
  const cartTotal = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('cart-checkout-btn');
  const entries = Object.entries(cart).filter(([, qty]) => qty > 0);

  if (entries.length === 0) {
    cartList.innerText = "Nog niets toegevoegd";
    cartTotal.innerText = "Totaal: €0.00";
    checkoutBtn.disabled = true;
    checkoutBtn.style.opacity = "0.5";
    return;
  }

  let html = "";
  for (const [drink, qty] of entries) {
    const price = currentPrices[drink]?.price || 0;
    const lineTotal = qty * price;
    html += `
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid #333; padding:6px 0; gap:10px;">
        <span style="text-transform: capitalize;">${qty}x ${drink}</span>
        <strong>€${lineTotal.toFixed(2)}</strong>
      </div>
    `;
  }

  cartList.innerHTML = html;
  cartTotal.innerText = `Totaal: €${calculateCartTotal().toFixed(2)}`;
  checkoutBtn.disabled = false;
  checkoutBtn.style.opacity = "1";
}

function clearCart() {
  cart = {};
  renderCart();
}

async function checkoutCart() {
  if (!myPin) {
    alert("Vul eerst je PIN in!");
    return;
  }

  const entries = Object.entries(cart).filter(([, qty]) => qty > 0);
  if (entries.length === 0) {
    alert("Bestelling is leeg");
    return;
  }

  for (const [drink, quantity] of entries) {
    const response = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drink,
        quantity,
        pin: String(myPin).trim()
      })
    });

    if (!response.ok) {
      alert("Fout bij bestelling! Is je PIN code juist?");
      document.getElementById('login-screen').style.display = 'flex';
      return;
    }
  }

  clearCart();
  fetchLivePrices();
}

// --- NIEUWE LOGICA VOOR DE LIVE PRIJZEN ---

let currentPrices = {};
const drinkOrder = ["water", "frisdrank", "pintje", "kriek", "kriek 0.0", "stella 0.0", "witte wijn", "kasteelbier rouge", "duvel", "trippel karmeliet"];

function ensureVisibilityConfig() {
  if (!config.visibleDrinks || typeof config.visibleDrinks !== "object") {
    config.visibleDrinks = {};
  }

  for (const drink of drinkOrder) {
    if (typeof config.visibleDrinks[drink] !== "boolean") {
      config.visibleDrinks[drink] = true;
    }
  }
}

function applyDrinkButtonVisibility() {
  for (const drink of drinkOrder) {
    const button = document.querySelector(`.pos-btn[data-drink="${drink}"]`);
    if (!button) continue;
    button.style.display = config.visibleDrinks[drink] === false ? 'none' : '';
  }
}

function renderVisibilityControls() {
  const controls = document.getElementById('config-visibility-controls');
  if (!controls) return;

  ensureVisibilityConfig();
  controls.innerHTML = "";

  for (const drink of drinkOrder) {
    const safeId = drink.replace(/\s+/g, '-');
    const row = document.createElement('label');
    row.setAttribute('for', `visibility-${safeId}`);
    row.innerHTML = `
      <input id="visibility-${safeId}" type="checkbox" ${config.visibleDrinks[drink] ? "checked" : ""}>
      <span>${drink}</span>
    `;
    controls.appendChild(row);

    const input = row.querySelector('input');
    input.addEventListener('change', () => {
      config.visibleDrinks[drink] = input.checked;
      if (!input.checked && cart[drink]) {
        delete cart[drink];
        renderCart();
      }
      applyDrinkButtonVisibility();
      saveVisibilityConfig();
    });
  }
}

async function saveVisibilityConfig() {
  try {
    const response = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config, pin: String(myPin).trim() })
    });

    if (!response.ok) {
      console.warn("Kon zichtbaarheid niet opslaan");
    }
  } catch (err) {
    console.error("Fout bij opslaan zichtbaarheid:", err);
  }
}

function renderLivePriceList() {
  let listHTML = "";
  for (const drink in currentPrices) {
    if (config.visibleDrinks && config.visibleDrinks[drink] === false) continue;
    const price = currentPrices[drink].price;

    listHTML += `
      <div style="border-bottom: 1px solid #333; padding: 10px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <span style="text-transform: capitalize;">${drink}</span>
          <strong style="color: #00C851;">€${price.toFixed(2)}</strong>
        </div>
      </div>
    `;
  }
  document.getElementById('live-price-list').innerHTML = listHTML;
}

// Haal de prijzen elke 3 seconden op
async function fetchLivePrices() {
  try {
    const res = await fetch("/api/prices");
    const data = await res.json();
    currentPrices = data.prices; // Update onze globale prijzen
    config = {
      ...config,
      ...(data.config || {}),
      visibleDrinks: {
        ...(data.config?.visibleDrinks || {}),
        ...(config.visibleDrinks || {})
      }
    };
    ensureVisibilityConfig();
    renderVisibilityControls();
    applyDrinkButtonVisibility();
    renderLivePriceList();
    renderCart();

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
renderCart();

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
      config = {
        ...config,
        ...data.config,
        visibleDrinks: {
          ...(data.config.visibleDrinks || {}),
          ...(config.visibleDrinks || {})
        }
      };
      ensureVisibilityConfig();
      
      // Vul de formulier in
      document.getElementById('config-base-water').value = config.basePrice?.water || 2.00;
      document.getElementById('config-base-alcohol').value = config.basePrice?.alcohol || 4.00;
      document.getElementById('config-price-increment').value = (config.priceIncrement * 100).toFixed(2);
      document.getElementById('config-price-jump-size').value = (config.priceJumpSize || 0.10).toFixed(2);
      document.getElementById('config-max-multiplier').value = config.maxMultiplier || 1.50;
      document.getElementById('config-min-multiplier').value = config.minMultiplier || 0.50;
      document.getElementById('config-decay-interval').value = config.decayInterval || 5000;
      renderVisibilityControls();
      applyDrinkButtonVisibility();
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
  config.visibleDrinks = {};
  for (const drink of drinkOrder) {
    config.visibleDrinks[drink] = true;
  }
  ensureVisibilityConfig();
  renderVisibilityControls();
  applyDrinkButtonVisibility();
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
    decayInterval: decayInterval,
    visibleDrinks: config.visibleDrinks
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
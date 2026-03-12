let selectedDrink = "";
let currentQuantity = 1;
let myPin = ""; // Hier slaan we de PIN op

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
    currentPrices = await res.json();
    
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
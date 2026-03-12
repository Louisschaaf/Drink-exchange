export async function onRequestPost(context) {
  const body = await context.request.json();
  
  // --- BEVEILIGING ---
  const SECRET_PIN = "5555"; // Zorg dat dit overeenkomt met je PIN!
  if (body.pin !== SECRET_PIN) {
    return new Response(JSON.stringify({ error: "Toegang geweigerd: Foute PIN!" }), {
      status: 403, headers: { "content-type": "application/json" }
    });
  }

  const purchasedDrink = body.drink;
  const quantity = body.quantity || 1; 

  // Koppel aan de juiste database versie (market_v3)
  let data = JSON.parse(await context.env.BAR_KV.get("market_v3") || "{}");

  if (!data.prices) {
    return new Response(JSON.stringify({ error: "Market initializing..." }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }

  // Hoe hard de prijzen stijgen/dalen per bestelling
  const PRICE_BUMP = 1.08; 
  const PRICE_DROP = 0.98;  

  for (let i = 0; i < quantity; i++) {
    for (const drinkName in data.prices) {
      
      // BEREKEN DE MAX EN MIN (50% SCHOMMELING) VANAF DE BASISPRIJS
      const basePrice = data.prices[drinkName].base;
      const maxPrice = basePrice * 1.50; // Maximaal +50%
      const minPrice = basePrice * 0.50; // Minimaal -50%

      if (drinkName === purchasedDrink) {
        data.prices[drinkName].price *= PRICE_BUMP;
        
        // Zorg dat de prijs niet boven het berekende maximum (bijv. €3.00 of €6.00) gaat
        if (data.prices[drinkName].price > maxPrice) {
          data.prices[drinkName].price = maxPrice;
        }
      } else {
        data.prices[drinkName].price *= PRICE_DROP;
        
        // Zorg dat de prijs niet onder het berekende minimum (bijv. €1.00 of €2.00) gaat
        if (data.prices[drinkName].price < minPrice) {
          data.prices[drinkName].price = minPrice;
        }
      }
    }
  }

  data.lastUpdate = Date.now();
  await context.env.BAR_KV.put("market_v3", JSON.stringify(data));

  return new Response(JSON.stringify(data.prices), {
    headers: { "content-type": "application/json" }
  });
}
export async function onRequestGet(context) {
  let data = JSON.parse(await context.env.BAR_KV.get("market_v3") || "{}");

  const defaultDrinks = {
    "water": { price: 2.00, base: 2.00 },
    "frisdrank": { price: 2.00, base: 2.00 },
    "pintje": { price: 2.00, base: 2.00 },
    "kriek": { price: 2.00, base: 2.00 },
    "witte wijn": { price: 4.00, base: 4.00 },
    "kasteelbier rouge": { price: 4.00, base: 4.00 },
    "duvel": { price: 4.00, base: 4.00 },
    "trippel karmeliet": { price: 4.00, base: 4.00 }
  };

  // Initialiseer als de database leeg is
  if (!data.prices) {
    data = { prices: defaultDrinks, lastUpdate: Date.now(), drinksSold: 0 };
    await context.env.BAR_KV.put("market_v3", JSON.stringify(data));
  }
  // Achterwaartse compatibiliteit voor bestaande database
  if (data.drinksSold === undefined) data.drinksSold = 0;

  const now = Date.now();
  const timeDiff = now - data.lastUpdate;
  const DECAY_INTERVAL = 5000; 

  if (timeDiff > DECAY_INTERVAL) {
    const ticks = Math.floor(timeDiff / DECAY_INTERVAL);
    let changed = false;

    for (const drink in data.prices) {
      let item = data.prices[drink];
      for (let i = 0; i < Math.min(ticks, 50); i++) { 
        const randomForce = (Math.random() * 0.014) + 0.001; 
        const randomJitter = Math.random();

        if (item.price > item.base) {
          if (randomJitter < 0.15) item.price *= (1 + (randomForce * 0.5));
          else item.price *= (1 - randomForce); 
          if (item.price < item.base) item.price = item.base;
          changed = true;
        } else if (item.price < item.base) {
          if (randomJitter < 0.15) item.price *= (1 - (randomForce * 0.5));
          else item.price *= (1 + randomForce); 
          if (item.price > item.base) item.price = item.base;
          changed = true;
        }
      }
      
      const maxPrice = item.base * 1.50;
      const minPrice = item.base * 0.50;
      if (item.price > maxPrice) item.price = maxPrice;
      if (item.price < minPrice) item.price = minPrice;
    }

    if (changed) {
      data.lastUpdate = now;
      await context.env.BAR_KV.put("market_v3", JSON.stringify(data));
    }
  }

  // LET OP: We sturen nu een object terug met 'prices' én 'drinksSold'
  return new Response(JSON.stringify({ prices: data.prices, drinksSold: data.drinksSold }), {
    headers: { "content-type": "application/json" }
  });
}
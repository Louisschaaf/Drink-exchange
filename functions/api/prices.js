export async function onRequestGet(context) {
  let data = JSON.parse(await context.env.BAR_KV.get("market_v3") || "{}");

  // De originele 8 categorieën, maar met de nieuwe €2 en €4 basisprijzen
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

  if (!data.prices) {
    data = {
      prices: defaultDrinks,
      lastUpdate: Date.now()
    };
    await context.env.BAR_KV.put("market_v3", JSON.stringify(data));
  }

  const now = Date.now();
  const timeDiff = now - data.lastUpdate;
  const DECAY_INTERVAL = 5000; 

  if (timeDiff > DECAY_INTERVAL) {
    const ticks = Math.floor(timeDiff / DECAY_INTERVAL);
    let changed = false;

    for (const drink in data.prices) {
      let item = data.prices[drink];
      
      for (let i = 0; i < Math.min(ticks, 50); i++) { 
        if (item.price > item.base) {
          item.price *= 0.995; 
          if (item.price < item.base) item.price = item.base;
          changed = true;
        } else if (item.price < item.base) {
          item.price *= 1.005; 
          if (item.price > item.base) item.price = item.base;
          changed = true;
        }
      }
    }

    if (changed) {
      data.lastUpdate = now;
      await context.env.BAR_KV.put("market_v3", JSON.stringify(data));
    }
  }

  return new Response(JSON.stringify(data.prices), {
    headers: { "content-type": "application/json" }
  });
}
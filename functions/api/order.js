export async function onRequestPost(context) {
  const body = await context.request.json();
  const SECRET_PIN = "5555"; 
  if (body.pin !== SECRET_PIN) {
    return new Response(JSON.stringify({ error: "Foute PIN!" }), { status: 403 });
  }

  let data = JSON.parse(await context.env.BAR_KV.get("market_v3") || "{}");
  if (!data.prices) return new Response(JSON.stringify({ error: "Initializing..." }), { status: 400 });
  if (data.drinksSold === undefined) data.drinksSold = 0;

  const quantity = body.quantity || 1; 
  data.drinksSold += quantity; // Tel de drankjes op!

  const CRASH_LIMIT = 50; // Na hoeveel drankjes crasht de boel?

  if (data.drinksSold >= CRASH_LIMIT) {
    // 🔥 BEURSCRASH 🔥
    for (const drinkName in data.prices) {
      const basePrice = data.prices[drinkName].base;
      data.prices[drinkName].price = basePrice * 0.50; // Alles naar de absolute bodemprijs!
    }
    data.drinksSold = 0; // Reset de teller voor de volgende crash
  } else {
    // Normale berekening
    const PRICE_BUMP = 1.08; 
    const PRICE_DROP = 0.98;  

    for (let i = 0; i < quantity; i++) {
      for (const drinkName in data.prices) {
        const basePrice = data.prices[drinkName].base;
        const maxPrice = basePrice * 1.50; 
        const minPrice = basePrice * 0.50; 

        if (drinkName === body.drink) {
          data.prices[drinkName].price *= PRICE_BUMP;
          if (data.prices[drinkName].price > maxPrice) data.prices[drinkName].price = maxPrice;
        } else {
          data.prices[drinkName].price *= PRICE_DROP;
          if (data.prices[drinkName].price < minPrice) data.prices[drinkName].price = minPrice;
        }
      }
    }
  }

  data.lastUpdate = Date.now();
  await context.env.BAR_KV.put("market_v3", JSON.stringify(data));

  return new Response(JSON.stringify({ prices: data.prices, drinksSold: data.drinksSold }), {
    headers: { "content-type": "application/json" }
  });
}
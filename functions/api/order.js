export async function onRequestPost(context) {
  const normalizeJumpSize = (rawJump) => {
    const numeric = Number(rawJump);
    if (!Number.isFinite(numeric)) return 0.10;
    return Math.max(0.10, Math.round(numeric * 10) / 10);
  };

  const snapToTenth = (value) => Math.round(value * 10) / 10;

  const body = await context.request.json();
  const SECRET_PIN = "5555"; 
  const submittedPin = String(body.pin ?? "").trim();
  if (submittedPin !== SECRET_PIN) {
    return new Response(JSON.stringify({ error: "Foute PIN!" }), { status: 403 });
  }

  let data = JSON.parse(await context.env.BAR_KV.get("market_v3") || "{}");
  if (!data.prices) return new Response(JSON.stringify({ error: "Initializing..." }), { status: 400 });
  if (data.drinksSold === undefined) data.drinksSold = 0;
  
  // Standaard config als die niet bestaat
  if (!data.config) {
    data.config = {
      basePrice: { water: 2.00, alcohol: 4.00 },
      priceJumpSize: 0.10,
      maxMultiplier: 1.50,
      minMultiplier: 0.50
    };
  }

  const quantity = body.quantity || 1; 
  data.drinksSold += quantity; // Tel de drankjes op!

  const priceJumpSize = normalizeJumpSize(data.config.priceJumpSize);
  data.config.priceJumpSize = priceJumpSize;
  const maxMultiplier = data.config.maxMultiplier || 1.50;
  const minMultiplier = data.config.minMultiplier || 0.50;
  const drinkNames = Object.keys(data.prices);

  if (!data.prices[body.drink]) {
    return new Response(JSON.stringify({ error: "Onbekende drank" }), { status: 400 });
  }

  // Elke verkochte eenheid: gekozen drank omhoog + een willekeurige andere drank omlaag.
  for (let i = 0; i < quantity; i++) {
    const selectedDrink = data.prices[body.drink];
    const selectedBase = selectedDrink.base;
    const selectedMax = selectedBase * maxMultiplier;

    selectedDrink.price += priceJumpSize;
    if (selectedDrink.price > selectedMax) selectedDrink.price = selectedMax;
    selectedDrink.price = snapToTenth(selectedDrink.price);

    const candidates = drinkNames.filter((name) => name !== body.drink);

    if (candidates.length > 0) {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      const affectedName = candidates[randomIndex];
      const affectedDrink = data.prices[affectedName];
      const affectedBase = affectedDrink.base;
      const affectedMin = affectedBase * minMultiplier;

      affectedDrink.price -= priceJumpSize;
      if (affectedDrink.price < affectedMin) affectedDrink.price = affectedMin;
      affectedDrink.price = snapToTenth(affectedDrink.price);
    }
  }
    const selected = data.prices[body.drink];

    if (typeof selected.stock !== "number") {
      selected.stock = 100;
    }
    selected.stock = Math.max(0, selected.stock - quantity);

  data.lastUpdate = Date.now();
  await context.env.BAR_KV.put("market_v3", JSON.stringify(data));

  return new Response(JSON.stringify({ prices: data.prices, drinksSold: data.drinksSold }), {
    headers: { "content-type": "application/json" }
  });
}
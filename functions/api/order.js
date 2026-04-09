export async function onRequestPost(context) {
  const normalizeJumpSize = (rawJump) => {
    const numeric = Number(rawJump);
    if (!Number.isFinite(numeric)) return 0.10;
    return Math.max(0.10, Math.round(numeric * 10) / 10);
  };

  const snapToTenth = (value) => Math.round(value * 10) / 10;

  const getDrinkCategory = (drinkName) => {
    const standard = new Set(["water", "frisdrank", "pintje", "kriek"]);
    return standard.has(drinkName) ? "standard" : "premium";
  };

  const body = await context.request.json();
  const SECRET_PIN = "5555"; 
  if (body.pin !== SECRET_PIN) {
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

  const CRASH_LIMIT = 50; // Na hoeveel drankjes crasht de boel?
  const priceJumpSize = normalizeJumpSize(data.config.priceJumpSize);
  data.config.priceJumpSize = priceJumpSize;
  const maxMultiplier = data.config.maxMultiplier || 1.50;
  const minMultiplier = data.config.minMultiplier || 0.50;

  if (!data.prices[body.drink]) {
    return new Response(JSON.stringify({ error: "Onbekende drank" }), { status: 400 });
  }

  const selectedCategory = getDrinkCategory(body.drink);

  if (data.drinksSold >= CRASH_LIMIT) {
    // 🔥 BEURSCRASH 🔥
    for (const drinkName in data.prices) {
      const basePrice = data.prices[drinkName].base;
      data.prices[drinkName].price = basePrice * 0.50; // Alles naar de absolute bodemprijs!
    }
    data.drinksSold = 0; // Reset de teller voor de volgende crash
  } else {
    // Realistischer beursgedrag: gekozen drank stijgt, andere dranken bewegen soms en random.
    for (let i = 0; i < quantity; i++) {
      const selected = data.prices[body.drink];
      const basePrice = selected.base;
      const maxPrice = basePrice * maxMultiplier;
      const minPrice = basePrice * minMultiplier;

      selected.price += priceJumpSize;
      if (selected.price > maxPrice) selected.price = maxPrice;
      if (selected.price < minPrice) selected.price = minPrice;
      selected.price = snapToTenth(selected.price);

      for (const drinkName in data.prices) {
        if (drinkName === body.drink) continue;

        const other = data.prices[drinkName];
        const otherBase = other.base;
        const otherMax = otherBase * maxMultiplier;
        const otherMin = otherBase * minMultiplier;
        const sameCategory = getDrinkCategory(drinkName) === selectedCategory;

        // Zelfde categorie beweegt wat vaker mee dan andere categorieen.
        const moveChance = sameCategory ? 0.35 : 0.12;
        if (Math.random() >= moveChance) continue;

        const upwardChance = sameCategory ? 0.45 : 0.50;
        const delta = Math.random() < upwardChance ? priceJumpSize : -priceJumpSize;

        other.price += delta;
        if (other.price > otherMax) other.price = otherMax;
        if (other.price < otherMin) other.price = otherMin;
        other.price = snapToTenth(other.price);
      }
    }
  }

  data.lastUpdate = Date.now();
  await context.env.BAR_KV.put("market_v3", JSON.stringify(data));

  return new Response(JSON.stringify({ prices: data.prices, drinksSold: data.drinksSold }), {
    headers: { "content-type": "application/json" }
  });
}
export async function onRequestGet(context) {
  const normalizeJumpSize = (rawJump) => {
    const numeric = Number(rawJump);
    if (!Number.isFinite(numeric)) return 0.10;
    return Math.max(0.10, Math.round(numeric * 10) / 10);
  };

  const snapToTenth = (value) => Math.round(value * 10) / 10;

  let data = JSON.parse(await context.env.BAR_KV.get("market_v3") || "{}");

  // Standaard config
  const defaultConfig = {
    basePrice: {
      water: 2.00,
      alcohol: 4.00
    },
    priceIncrement: 0.014,
    priceJumpSize: 0.10,
    maxMultiplier: 1.50,
    minMultiplier: 0.50,
    decayInterval: 5000,
    visibleDrinks: {
      "water": true,
      "frisdrank": true,
      "pintje": true,
      "kriek": true,
      "kriek 0.0": true,
      "witte wijn": true,
      "kasteelbier rouge": true,
      "duvel": true,
      "trippel karmeliet": true,
      "stella 0.0": true
    }
  };

  const defaultDrinks = {
    "water": { price: 2.00, base: 2.00, stock: 100 },
    "frisdrank": { price: 2.00, base: 2.00, stock: 100 },
    "pintje": { price: 2.00, base: 2.00, stock: 100 },
    "kriek": { price: 2.00, base: 2.00, stock: 100 },
    "kriek 0.0": { price: 2.00, base: 2.00, stock: 100 },
    "witte wijn": { price: 4.00, base: 4.00, stock: 100 },
    "kasteelbier rouge": { price: 4.00, base: 4.00, stock: 100 },
    "duvel": { price: 4.00, base: 4.00, stock: 100 },
    "trippel karmeliet": { price: 4.00, base: 4.00, stock: 100 },
    "stella 0.0": { price: 2.00, base: 2.00, stock: 100 }
  };

  let migratedLegacyBases = false;

  // Initialiseer als de database leeg is
  if (!data.prices) {
    data = { prices: defaultDrinks, lastUpdate: Date.now(), drinksSold: 0, config: defaultConfig };
    await context.env.BAR_KV.put("market_v3", JSON.stringify(data));
  } else {
    for (const drink in defaultDrinks) {
      if (!data.prices[drink]) {
        data.prices[drink] = structuredClone(defaultDrinks[drink]);
        migratedLegacyBases = true;
      }
    }
  }
  
  // Zorg ervoor dat config bestaat
  if (!data.config) {
    data.config = defaultConfig;
  } else {
    if (!data.config.visibleDrinks || typeof data.config.visibleDrinks !== "object") {
      data.config.visibleDrinks = defaultConfig.visibleDrinks;
    }

    for (const drink of Object.keys(defaultConfig.visibleDrinks)) {
      if (typeof data.config.visibleDrinks[drink] !== "boolean") {
        data.config.visibleDrinks[drink] = true;
      }
    }
  }

  // Houd pintje en kriek in de standaard prijsgroep (zelfde base als water/frisdrank).
  for (const drink of ["water", "frisdrank", "pintje", "kriek", "kriek 0.0", "stella 0.0"]) {
    if (data.prices[drink]) {
      const standardBase = data.config.basePrice.water;
      if (data.prices[drink].base !== standardBase) {
        data.prices[drink].base = standardBase;
        // Corrigeer legacy data waar pintje/kriek fout op de 4-euro groep stonden.
        if (drink === "pintje" || drink === "kriek") {
          data.prices[drink].price = standardBase;
        }
        migratedLegacyBases = true;
      }
      if (typeof data.prices[drink].stock !== "number") {
        data.prices[drink].stock = 100;
        migratedLegacyBases = true;
      }
    }
  }

  for (const drink in data.prices) {
    if (typeof data.prices[drink].stock !== "number") {
      data.prices[drink].stock = 100;
      migratedLegacyBases = true;
    }
  }

  // Achterwaartse compatibiliteit voor bestaande database
  if (data.drinksSold === undefined) data.drinksSold = 0;

  // Haal config instellingen
  const config = data.config;
  const DECAY_INTERVAL = config.decayInterval || 5000;
  const MAX_MULTIPLIER = config.maxMultiplier || 1.50;
  const MIN_MULTIPLIER = config.minMultiplier || 0.50;
  const PRICE_JUMP_SIZE = normalizeJumpSize(config.priceJumpSize);
  config.priceJumpSize = PRICE_JUMP_SIZE;

  const now = Date.now();
  const timeDiff = now - data.lastUpdate;

  if (migratedLegacyBases) {
    await context.env.BAR_KV.put("market_v3", JSON.stringify(data));
  }

  if (timeDiff > DECAY_INTERVAL) {
    const ticks = Math.floor(timeDiff / DECAY_INTERVAL);
    let changed = false;

    const drinkNames = Object.keys(data.prices);

    for (let i = 0; i < Math.min(ticks, 50); i++) {
      const candidates = drinkNames.filter((drink) => {
        const item = data.prices[drink];
        const minPrice = item.base * MIN_MULTIPLIER;
        return item.price > minPrice + 0.0001;
      });

      if (candidates.length === 0) break;

      const targetName = candidates[Math.floor(Math.random() * candidates.length)];
      const item = data.prices[targetName];
      const oldPrice = item.price;
      const minPrice = item.base * MIN_MULTIPLIER;

      // Per verlopen tick zakt precies één willekeurige drank een stap.
      item.price -= PRICE_JUMP_SIZE;
      if (item.price < minPrice) item.price = minPrice;
      item.price = snapToTenth(item.price);

      if (item.price !== oldPrice) changed = true;
    }

    if (changed || ticks > 0) {
      data.lastUpdate = now;
      await context.env.BAR_KV.put("market_v3", JSON.stringify(data));
    }
  }

  // LET OP: We sturen nu een object terug met 'prices', 'drinksSold' en 'config'
  return new Response(JSON.stringify({ prices: data.prices, drinksSold: data.drinksSold, config: data.config }), {
    headers: { "content-type": "application/json" }
  });
}
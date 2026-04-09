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
    decayInterval: 5000
  };

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
    data = { prices: defaultDrinks, lastUpdate: Date.now(), drinksSold: 0, config: defaultConfig };
    await context.env.BAR_KV.put("market_v3", JSON.stringify(data));
  }
  
  // Zorg ervoor dat config bestaat
  if (!data.config) {
    data.config = defaultConfig;
  }

  // Houd pintje en kriek in de standaard prijsgroep (zelfde base als water/frisdrank).
  let migratedLegacyBases = false;
  for (const drink of ["water", "frisdrank", "pintje", "kriek"]) {
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

    for (const drink in data.prices) {
      let item = data.prices[drink];
      for (let i = 0; i < Math.min(ticks, 50); i++) {
        const oldPrice = item.price;
        const atBase = Math.abs(item.price - item.base) < 0.001;

        // Random timing: niet elke tick beweegt de prijs.
        if (atBase) {
          // Op de basisprijs: kleine kans op een willekeurige sprong.
          if (Math.random() < 0.12) {
            item.price += Math.random() < 0.5 ? -PRICE_JUMP_SIZE : PRICE_JUMP_SIZE;
          }
        } else {
          // Weg van basisprijs: meestal 1 vaste stap terug naar de basis.
          if (Math.random() < 0.65) {
            if (item.price > item.base) item.price -= PRICE_JUMP_SIZE;
            else item.price += PRICE_JUMP_SIZE;
          }
        }

        item.price = snapToTenth(item.price);
        if (item.price !== oldPrice) changed = true;
      }
      
      const maxPrice = item.base * MAX_MULTIPLIER;
      const minPrice = item.base * MIN_MULTIPLIER;
      if (item.price > maxPrice) item.price = maxPrice;
      if (item.price < minPrice) item.price = minPrice;
      item.price = snapToTenth(item.price);
    }

    if (changed) {
      data.lastUpdate = now;
      await context.env.BAR_KV.put("market_v3", JSON.stringify(data));
    }
  }

  // LET OP: We sturen nu een object terug met 'prices', 'drinksSold' en 'config'
  return new Response(JSON.stringify({ prices: data.prices, drinksSold: data.drinksSold, config: data.config }), {
    headers: { "content-type": "application/json" }
  });
}
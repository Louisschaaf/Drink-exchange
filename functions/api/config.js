export async function onRequestGet(context) {
  try {
    let data = JSON.parse(await context.env.BAR_KV.get("market_v3") || "{}");

    // Default config
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

    // Haal config of gebruik defaults
    if (!data.config) {
      data.config = defaultConfig;
    }

    return new Response(JSON.stringify({ config: data.config }), {
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    console.error("Config GET error:", err);
    return new Response(JSON.stringify({ error: "Failed to load config" }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

export async function onRequestPost(context) {
  try {
    const normalizeJumpSize = (rawJump) => {
      const numeric = Number(rawJump);
      if (!Number.isFinite(numeric)) return 0.10;
      return Math.max(0.10, Math.round(numeric * 10) / 10);
    };

    const bodyText = await context.request.text();
    const body = JSON.parse(bodyText);

    // PIN validatie (simpel - in productie meer beveiligde methode gebruiken)
    const correctPin = "5555"; // Dit moet uit env variabelen komen
    if (body.pin !== correctPin) {
      return new Response(JSON.stringify({ error: "Ongeldige PIN" }), {
        status: 401,
        headers: { "content-type": "application/json" }
      });
    }

    let data = JSON.parse(await context.env.BAR_KV.get("market_v3") || "{}");

    if (!data.prices) {
      return new Response(JSON.stringify({ error: "Data niet geinitialiseerd" }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }

    // Sla de nieuwe config op
    data.config = body.config;
    data.config.priceJumpSize = normalizeJumpSize(body?.config?.priceJumpSize);

    // Update ook de base prices in de drink prijzen
    if (body.config.basePrice) {
      const standardDrinks = ["water", "frisdrank", "pintje", "kriek"];
      const premiumDrinks = ["witte wijn", "kasteelbier rouge", "duvel", "trippel karmeliet"];

      for (const drink of standardDrinks) {
        if (data.prices[drink]) {
          data.prices[drink].base = body.config.basePrice.water;
          // Reset prijs naar base
          data.prices[drink].price = body.config.basePrice.water;
        }
      }

      for (const drink of premiumDrinks) {
        if (data.prices[drink]) {
          data.prices[drink].base = body.config.basePrice.alcohol;
          // Reset prijs naar base
          data.prices[drink].price = body.config.basePrice.alcohol;
        }
      }
    }

    await context.env.BAR_KV.put("market_v3", JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, config: data.config }), {
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    console.error("Config POST error:", err);
    return new Response(JSON.stringify({ error: "Failed to save config" }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

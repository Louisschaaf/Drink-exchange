export async function onRequestPost(context) {
  try {
    const normalizeJumpSize = (rawJump) => {
      const numeric = Number(rawJump);
      if (!Number.isFinite(numeric)) return 0.10;
      return Math.max(0.10, Math.round(numeric * 10) / 10);
    };

    const snapToTenth = (value) => Math.round(value * 10) / 10;

    const bodyText = await context.request.text();
    const body = JSON.parse(bodyText);

    // PIN validatie
    const correctPin = "5555"; // Dit moet uit env variabelen komen
    if (body.pin !== correctPin) {
      return new Response(JSON.stringify({ error: "Ongeldige PIN" }), {
        status: 401,
        headers: { "content-type": "application/json" }
      });
    }

    let data = JSON.parse(await context.env.BAR_KV.get("market_v3") || "{}");

    if (!data.prices || !data.config) {
      return new Response(JSON.stringify({ error: "Data niet geinitialiseerd" }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }

    const config = data.config;
    const priceJumpSize = normalizeJumpSize(config.priceJumpSize);
    config.priceJumpSize = priceJumpSize;
    const waterDrinks = ["water", "frisdrank"];
    const alcoholDrinks = ["pintje", "kriek", "witte wijn", "kasteelbier rouge", "duvel", "trippel karmeliet"];

    switch (body.action) {
      case "reset_prices":
        // Reset alle prijzen naar hun base waarde
        for (const drink in data.prices) {
          data.prices[drink].price = data.prices[drink].base;
        }
        data.lastUpdate = Date.now();
        break;

      case "price_jump_up":
        // Verhoog alle prijzen met de ingestelde prijs sprong
        for (const drink in data.prices) {
          data.prices[drink].price += priceJumpSize;
          
          // Zorg dat het niet boven de max gaat
          const maxPrice = data.prices[drink].base * config.maxMultiplier;
          if (data.prices[drink].price > maxPrice) {
            data.prices[drink].price = maxPrice;
          }
          data.prices[drink].price = snapToTenth(data.prices[drink].price);
        }
        data.lastUpdate = Date.now();
        break;

      case "price_jump_down":
        // Verlaag alle prijzen met de ingestelde prijs sprong
        for (const drink in data.prices) {
          data.prices[drink].price -= priceJumpSize;
          
          // Zorg dat het niet onder de min gaat
          const minPrice = data.prices[drink].base * config.minMultiplier;
          if (data.prices[drink].price < minPrice) {
            data.prices[drink].price = minPrice;
          }
          data.prices[drink].price = snapToTenth(data.prices[drink].price);
        }
        data.lastUpdate = Date.now();
        break;

      default:
        return new Response(JSON.stringify({ error: "Onbekende actie" }), {
          status: 400,
          headers: { "content-type": "application/json" }
        });
    }

    await context.env.BAR_KV.put("market_v3", JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, action: body.action }), {
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    console.error("Admin action error:", err);
    return new Response(JSON.stringify({ error: "Failed to execute admin action" }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

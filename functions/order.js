export async function onRequestPost(context) {

  const body = await context.request.json()
  const drink = body.drink

  let prices = JSON.parse(
    await context.env.BAR_KV.get("prices") || "{}"
  )

  if (!prices[drink]) {
    prices[drink] = { price: 3, demand: 0 }
  }

  prices[drink].demand += 1
  prices[drink].price *= 1.03

  await context.env.BAR_KV.put("prices", JSON.stringify(prices))

  return new Response(JSON.stringify(prices))
}
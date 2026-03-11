export async function onRequestGet(context) {

  const data = await context.env.BAR_KV.get("prices")

  return new Response(data || "{}", {
    headers: { "content-type": "application/json" }
  })
}
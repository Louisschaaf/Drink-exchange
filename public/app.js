const API = "/api"

async function loadPrices() {
  const res = await fetch(API + "/prices")
  const data = await res.json()

  const div = document.getElementById("prices")
  div.innerHTML = ""

  for (const drink in data) {
    div.innerHTML += `<p>${drink}: €${data[drink].price.toFixed(2)}</p>`
  }
}

async function orderDrink(drink) {
  await fetch(API + "/order", {
    method: "POST",
    body: JSON.stringify({ drink })
  })

  loadPrices()
}

setInterval(loadPrices, 5000)

loadPrices()
import { onRequestPost as __api_order_js_onRequestPost } from "/home/louis/Documents/GitHub/Drink-exchange/functions/api/order.js"
import { onRequestGet as __api_prices_js_onRequestGet } from "/home/louis/Documents/GitHub/Drink-exchange/functions/api/prices.js"

export const routes = [
    {
      routePath: "/api/order",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_order_js_onRequestPost],
    },
  {
      routePath: "/api/prices",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_prices_js_onRequestGet],
    },
  ]
import { onRequestPost as __api_admin_js_onRequestPost } from "/home/louis/Documents/GitHub/Drink-exchange/functions/api/admin.js"
import { onRequestGet as __api_config_js_onRequestGet } from "/home/louis/Documents/GitHub/Drink-exchange/functions/api/config.js"
import { onRequestPost as __api_config_js_onRequestPost } from "/home/louis/Documents/GitHub/Drink-exchange/functions/api/config.js"
import { onRequestPost as __api_order_js_onRequestPost } from "/home/louis/Documents/GitHub/Drink-exchange/functions/api/order.js"
import { onRequestGet as __api_prices_js_onRequestGet } from "/home/louis/Documents/GitHub/Drink-exchange/functions/api/prices.js"

export const routes = [
    {
      routePath: "/api/admin",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_admin_js_onRequestPost],
    },
  {
      routePath: "/api/config",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_config_js_onRequestGet],
    },
  {
      routePath: "/api/config",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_config_js_onRequestPost],
    },
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
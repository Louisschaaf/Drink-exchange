var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/admin.js
async function onRequestPost(context) {
  try {
    const normalizeJumpSize = /* @__PURE__ */ __name((rawJump) => {
      const numeric = Number(rawJump);
      if (!Number.isFinite(numeric)) return 0.1;
      return Math.max(0.1, Math.round(numeric * 10) / 10);
    }, "normalizeJumpSize");
    const snapToTenth = /* @__PURE__ */ __name((value) => Math.round(value * 10) / 10, "snapToTenth");
    const bodyText = await context.request.text();
    const body = JSON.parse(bodyText);
    const correctPin = "5555";
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
        for (const drink in data.prices) {
          data.prices[drink].price = data.prices[drink].base;
        }
        data.lastUpdate = Date.now();
        break;
      case "price_jump_up":
        for (const drink in data.prices) {
          data.prices[drink].price += priceJumpSize;
          const maxPrice = data.prices[drink].base * config.maxMultiplier;
          if (data.prices[drink].price > maxPrice) {
            data.prices[drink].price = maxPrice;
          }
          data.prices[drink].price = snapToTenth(data.prices[drink].price);
        }
        data.lastUpdate = Date.now();
        break;
      case "price_jump_down":
        for (const drink in data.prices) {
          data.prices[drink].price -= priceJumpSize;
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
__name(onRequestPost, "onRequestPost");

// api/config.js
async function onRequestGet(context) {
  try {
    let data = JSON.parse(await context.env.BAR_KV.get("market_v3") || "{}");
    const defaultConfig = {
      basePrice: {
        water: 2,
        alcohol: 4
      },
      priceIncrement: 0.014,
      priceJumpSize: 0.1,
      maxMultiplier: 1.5,
      minMultiplier: 0.5,
      decayInterval: 5e3
    };
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
__name(onRequestGet, "onRequestGet");
async function onRequestPost2(context) {
  try {
    const normalizeJumpSize = /* @__PURE__ */ __name((rawJump) => {
      const numeric = Number(rawJump);
      if (!Number.isFinite(numeric)) return 0.1;
      return Math.max(0.1, Math.round(numeric * 10) / 10);
    }, "normalizeJumpSize");
    const bodyText = await context.request.text();
    const body = JSON.parse(bodyText);
    const correctPin = "5555";
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
    data.config = body.config;
    data.config.priceJumpSize = normalizeJumpSize(body?.config?.priceJumpSize);
    if (body.config.basePrice) {
      const standardDrinks = ["water", "frisdrank", "pintje", "kriek"];
      const premiumDrinks = ["witte wijn", "kasteelbier rouge", "duvel", "trippel karmeliet"];
      for (const drink of standardDrinks) {
        if (data.prices[drink]) {
          data.prices[drink].base = body.config.basePrice.water;
          data.prices[drink].price = body.config.basePrice.water;
        }
      }
      for (const drink of premiumDrinks) {
        if (data.prices[drink]) {
          data.prices[drink].base = body.config.basePrice.alcohol;
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
__name(onRequestPost2, "onRequestPost");

// api/order.js
async function onRequestPost3(context) {
  const normalizeJumpSize = /* @__PURE__ */ __name((rawJump) => {
    const numeric = Number(rawJump);
    if (!Number.isFinite(numeric)) return 0.1;
    return Math.max(0.1, Math.round(numeric * 10) / 10);
  }, "normalizeJumpSize");
  const snapToTenth = /* @__PURE__ */ __name((value) => Math.round(value * 10) / 10, "snapToTenth");
  const getDrinkCategory = /* @__PURE__ */ __name((drinkName) => {
    const standard = /* @__PURE__ */ new Set(["water", "frisdrank", "pintje", "kriek"]);
    return standard.has(drinkName) ? "standard" : "premium";
  }, "getDrinkCategory");
  const body = await context.request.json();
  const SECRET_PIN = "5555";
  if (body.pin !== SECRET_PIN) {
    return new Response(JSON.stringify({ error: "Foute PIN!" }), { status: 403 });
  }
  let data = JSON.parse(await context.env.BAR_KV.get("market_v3") || "{}");
  if (!data.prices) return new Response(JSON.stringify({ error: "Initializing..." }), { status: 400 });
  if (data.drinksSold === void 0) data.drinksSold = 0;
  if (!data.config) {
    data.config = {
      basePrice: { water: 2, alcohol: 4 },
      priceJumpSize: 0.1,
      maxMultiplier: 1.5,
      minMultiplier: 0.5
    };
  }
  const quantity = body.quantity || 1;
  data.drinksSold += quantity;
  const CRASH_LIMIT = 50;
  const priceJumpSize = normalizeJumpSize(data.config.priceJumpSize);
  data.config.priceJumpSize = priceJumpSize;
  const maxMultiplier = data.config.maxMultiplier || 1.5;
  const minMultiplier = data.config.minMultiplier || 0.5;
  if (!data.prices[body.drink]) {
    return new Response(JSON.stringify({ error: "Onbekende drank" }), { status: 400 });
  }
  const selectedCategory = getDrinkCategory(body.drink);
  if (data.drinksSold >= CRASH_LIMIT) {
    for (const drinkName in data.prices) {
      const basePrice = data.prices[drinkName].base;
      data.prices[drinkName].price = basePrice * 0.5;
    }
    data.drinksSold = 0;
  } else {
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
        const moveChance = sameCategory ? 0.35 : 0.12;
        if (Math.random() >= moveChance) continue;
        const upwardChance = sameCategory ? 0.45 : 0.5;
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
__name(onRequestPost3, "onRequestPost");

// api/prices.js
async function onRequestGet2(context) {
  const normalizeJumpSize = /* @__PURE__ */ __name((rawJump) => {
    const numeric = Number(rawJump);
    if (!Number.isFinite(numeric)) return 0.1;
    return Math.max(0.1, Math.round(numeric * 10) / 10);
  }, "normalizeJumpSize");
  const snapToTenth = /* @__PURE__ */ __name((value) => Math.round(value * 10) / 10, "snapToTenth");
  let data = JSON.parse(await context.env.BAR_KV.get("market_v3") || "{}");
  const defaultConfig = {
    basePrice: {
      water: 2,
      alcohol: 4
    },
    priceIncrement: 0.014,
    priceJumpSize: 0.1,
    maxMultiplier: 1.5,
    minMultiplier: 0.5,
    decayInterval: 5e3
  };
  const defaultDrinks = {
    "water": { price: 2, base: 2 },
    "frisdrank": { price: 2, base: 2 },
    "pintje": { price: 2, base: 2 },
    "kriek": { price: 2, base: 2 },
    "witte wijn": { price: 4, base: 4 },
    "kasteelbier rouge": { price: 4, base: 4 },
    "duvel": { price: 4, base: 4 },
    "trippel karmeliet": { price: 4, base: 4 }
  };
  if (!data.prices) {
    data = { prices: defaultDrinks, lastUpdate: Date.now(), drinksSold: 0, config: defaultConfig };
    await context.env.BAR_KV.put("market_v3", JSON.stringify(data));
  }
  if (!data.config) {
    data.config = defaultConfig;
  }
  let migratedLegacyBases = false;
  for (const drink of ["water", "frisdrank", "pintje", "kriek"]) {
    if (data.prices[drink]) {
      const standardBase = data.config.basePrice.water;
      if (data.prices[drink].base !== standardBase) {
        data.prices[drink].base = standardBase;
        if (drink === "pintje" || drink === "kriek") {
          data.prices[drink].price = standardBase;
        }
        migratedLegacyBases = true;
      }
    }
  }
  if (data.drinksSold === void 0) data.drinksSold = 0;
  const config = data.config;
  const DECAY_INTERVAL = config.decayInterval || 5e3;
  const MAX_MULTIPLIER = config.maxMultiplier || 1.5;
  const MIN_MULTIPLIER = config.minMultiplier || 0.5;
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
        const atBase = Math.abs(item.price - item.base) < 1e-3;
        if (atBase) {
          if (Math.random() < 0.12) {
            item.price += Math.random() < 0.5 ? -PRICE_JUMP_SIZE : PRICE_JUMP_SIZE;
          }
        } else {
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
  return new Response(JSON.stringify({ prices: data.prices, drinksSold: data.drinksSold, config: data.config }), {
    headers: { "content-type": "application/json" }
  });
}
__name(onRequestGet2, "onRequestGet");

// ../.wrangler/tmp/pages-r2LIJ7/functionsRoutes-0.2817268656332388.mjs
var routes = [
  {
    routePath: "/api/admin",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/config",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/config",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/order",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/prices",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  }
];

// ../../../../.nvm/versions/node/v20.20.1/lib/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../.nvm/versions/node/v20.20.1/lib/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../../../.nvm/versions/node/v20.20.1/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../.nvm/versions/node/v20.20.1/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-ooU36k/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../../../.nvm/versions/node/v20.20.1/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-ooU36k/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.6824405521682388.mjs.map

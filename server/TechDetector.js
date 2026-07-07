import axios from "axios";

const TECH_RULES = [
  {
    name: "WordPress",
    match: [/wp-content/, /wp-includes/]
  },
  {
    name: "Laravel",
    match: [/laravel/, /csrf-token/]
  },
  {
    name: "React",
    match: [/__NEXT_DATA__/, /data-reactroot/, /_reactRootContainer/]
  },
  {
    name: "Vue.js",
    match: [/vue/, /v-app/, /data-v-/]
  },
  {
    name: "jQuery",
    match: [/jquery/i]
  },
  {
    name: "Shopify",
    match: [/cdn\.shopify\.com/]
  },
  {
    name: "Bootstrap",
    match: [/bootstrap/i]
  },
  {
    name: "Django",
    match: [/csrftoken/i, /csrfmiddlewaretoken/i, /django/i]
  },
  {
    name: "Flask",
    match: [/werkzeug/i, /flask/i]
  },
  {
    name: "Ruby on Rails",
    match: [/rails/i, /_session_id/i]
  },
  {
    name: "Angular",
    match: [/ng-version/i, /ng-reflect-/i]
  }
];

export async function detectTech(domain) {
  try {
    const url = `https://${domain}`;

    const res = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (TechDetector Bot)"
      }
    });

    const html = res.data || "";
    const headers = res.headers || {};

    const detected = new Set(); 
    const server = (headers["server"] || "").toLowerCase();
    const xPowered = (headers["x-powered-by"] || "").toLowerCase();

    if (xPowered.includes("php")) detected.add("PHP");
    if (xPowered.includes("express")) detected.add("Express.js");

    if (server.includes("nginx")) detected.add("Nginx");
    if (server.includes("apache")) detected.add("Apache");

    for (const tech of TECH_RULES) {
      for (const rule of tech.match) {
        if (rule.test(html)) {
          detected.add(tech.name);
          break;
        }
      }
    }

    return [...detected];

  } catch (err) {
    console.log(`Błąd analizy ${domain}:`, err.message);
    return [];
  }
}
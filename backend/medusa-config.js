const { defineConfig, loadEnv } = require("@medusajs/framework/utils");

loadEnv(process.env.NODE_ENV || "development", process.cwd());

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    workerMode: process.env.MEDUSA_WORKER_MODE || "server",
    http: {
      storeCors: process.env.STORE_CORS,
      adminCors: process.env.ADMIN_CORS,
      authCors: process.env.AUTH_CORS,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  admin: {
    disable: false,
    backendUrl: process.env.MEDUSA_BACKEND_URL || "https://seahorse-production.up.railway.app",
  },
  modules: {
    cache: {
      resolve: "@medusajs/cache-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    eventBus: {
      resolve: "@medusajs/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    workflows: {
      resolve: "@medusajs/workflow-engine-redis",
      options: {
        redis: {
          redisUrl: process.env.REDIS_URL,
        },
      },
    },
    file: {
      resolve: "@medusajs/file",
      options: {
        providers: [
          {
            resolve: "./src/modules/file-bunny",
            id: "bunny",
            options: {
              storage_zone: process.env.BUNNY_STORAGE_ZONE,
              storage_password: process.env.BUNNY_STORAGE_PASSWORD,
              storage_endpoint: process.env.BUNNY_STORAGE_ENDPOINT,
              cdn_url: process.env.BUNNY_CDN_URL,
            },
          },
        ],
      },
    },
    tax: {
      resolve: "@medusajs/tax",
      options: {
        providers: [
          {
            resolve: "./src/modules/tax-stripe",
            id: "stripe-tax",
            options: {
              api_key: process.env.STRIPE_API_KEY,
            },
          },
        ],
      },
    },
    payment: {
      resolve: "@medusajs/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
      },
    },
  },
});

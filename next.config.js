const nextConfig = {
    reactStrictMode: true,
    typescript: {
        ignoreBuildErrors: true,
    },
    webpack: (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            "fs": false,
            "encoding": false,
            "os": false,
            "path": false,
            "crypto": false,
        };
        return config;
    },
}

const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    clientsClaim: true,
    disable: process.env.NODE_ENV === 'development',
    runtimeCaching: [
        {
            urlPattern: /\/models\/.*\.(json|shard.*)$/,
            handler: "CacheFirst",
            options: {
                cacheName: "ai-models-cache",
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
                cacheableResponse: {
                    statuses: [0, 200],
                },
            },
        },
        // Force caching of the root page and main assets for offline boot
        {
            urlPattern: ({ url }) => url.pathname === '/',
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'app-shell',
            }
        },
        {
            urlPattern: /\/_next\/data\/.*\.json$/,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'next-data',
            }
        },
        {
            urlPattern: /\/_next\/static\/.*/,
            handler: 'CacheFirst',
            options: {
                cacheName: 'static-assets',
            }
        },
        {
            urlPattern: /^https?.*/,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'offlineCache',
                expiration: {
                    maxEntries: 200,
                },
            },
        }
    ]
})

module.exports = withPWA(nextConfig)




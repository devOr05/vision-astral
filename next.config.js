/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    runtimeCaching: [
        {
            urlPattern: ({ url }) => {
                return url.pathname.startsWith("/models");
            },
            handler: "CacheFirst",
            options: {
                cacheName: "ai-models-cache",
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
            },
        },
        // Fallback for everything else (using default strategy pattern for Next.js PWA)
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

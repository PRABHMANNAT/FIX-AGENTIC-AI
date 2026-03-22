/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'html-pdf-node',
      'puppeteer',
      'puppeteer-core',
    ],
  },
};

module.exports = nextConfig;

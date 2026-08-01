/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `npm run build:check` points this at a throwaway directory so a production
  // build can never overwrite the .next that a running `npm run dev` is serving
  // from — doing that corrupts the dev server and every page starts 500ing.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // Notes is the workspace's home. Redirecting here rather than from a root
  // page.js keeps it at the HTTP layer — calling redirect() during render makes
  // the router update mid-render, which React logs as an error in dev.
  async redirects() {
    return [{ source: '/', destination: '/notes', permanent: false }];
  },
};

export default nextConfig;

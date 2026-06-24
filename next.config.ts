import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async headers() {
    return [
      {
        // Scroll-sequence frames are content-stable — cache them immutably.
        // Vercel already does this for /public; this is belt-and-suspenders.
        source: '/assets/landing/baseball-scroll-frames/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

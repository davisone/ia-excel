import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/taskpane/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.office.com https://*.office365.com https://*.microsoft.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

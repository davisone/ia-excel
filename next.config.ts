import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/taskpane/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.office.com https://*.office365.com https://*.microsoft.com https://*.officeapps.live.com https://*.live.com https://*.sharepoint.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

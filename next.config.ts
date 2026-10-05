import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/admin/digital-id', destination: '/digital-id' },
      { source: '/admin/roster', destination: '/roster' },
      { source: '/admin/zones', destination: '/zones' },
      { source: '/admin/audit', destination: '/audit' },
      { source: '/admin/organizers', destination: '/organizers' },
    ]
  },
};

export default nextConfig;

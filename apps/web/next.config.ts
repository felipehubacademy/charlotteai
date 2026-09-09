import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingIncludes: {
    // ffmpeg-static ships the platform binary under node_modules; must be
    // copied into the serverless bundle so fluent-ffmpeg can spawn it.
    '/api/pronunciation': ['./node_modules/ffmpeg-static/ffmpeg'],
  },
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'fluent-ffmpeg': false,
      };
    }
    return config;
  },
  images: {
    domains: [],
    unoptimized: false
  },
};

export default nextConfig;

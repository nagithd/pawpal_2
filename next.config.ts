import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "wltdablehsibiglpsiim.supabase.co",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "down-vn.img.susercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "filebroker-cdn.lazada.vn",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "kokopet.vn",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "hachikopetshop.vn",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "vietgiftmarket.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "senyeu.vn",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

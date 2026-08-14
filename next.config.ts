import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the whole app is plain HTML/JS/CSS served by GitHub Pages,
  // with Firebase (Auth/Firestore/Storage) as the only backend — no Node
  // server to run or maintain.
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

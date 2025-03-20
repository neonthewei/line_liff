let userConfig = undefined;
try {
  userConfig = await import("./v0-user-next.config");
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Production optimizations
  swcMinify: true, // Use SWC for minification (faster than Terser)
  reactStrictMode: true,
  // Improve module resolution performance
  modularizeImports: {
    recharts: {
      transform: "recharts/{{member}}",
    },
  },
  // Improve bundle optimization
  compiler: {
    // Enables the SWC compiler's optimization for React components
    reactRemoveProperties: process.env.NODE_ENV === "production",
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
    // Add optimizations for faster client-side rendering
    optimizePackageImports: ["recharts"], // Tree-shake large packages
    // 移除不相容的 ppr 實驗性功能和 optimizeCss
  },
};

mergeConfig(nextConfig, userConfig);

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return;
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === "object" &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      };
    } else {
      nextConfig[key] = userConfig[key];
    }
  }
}

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_FRONTEND_AGENT_URL: process.env.NEXT_PUBLIC_FRONTEND_AGENT_URL || 'http://localhost:8201',
    NEXT_PUBLIC_BACKEND_AGENT_URL: process.env.NEXT_PUBLIC_BACKEND_AGENT_URL || 'http://localhost:8202',
    NEXT_PUBLIC_TESTING_AGENT_URL: process.env.NEXT_PUBLIC_TESTING_AGENT_URL || 'http://localhost:8203',
    NEXT_PUBLIC_DEVOPS_AGENT_URL: process.env.NEXT_PUBLIC_DEVOPS_AGENT_URL || 'http://localhost:8204',
    NEXT_PUBLIC_PM_AGENT_URL: process.env.NEXT_PUBLIC_PM_AGENT_URL || 'http://localhost:8205',
    NEXT_PUBLIC_PROJECT_ADMIN_AGENT_URL: process.env.NEXT_PUBLIC_PROJECT_ADMIN_AGENT_URL || 'http://localhost:8206',
    SKILLS_DIR: process.env.SKILLS_DIR || '',
  },
  async rewrites() {
    return [
      {
        source: '/upload',
        destination: 'http://localhost:8400/upload',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:8400/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;

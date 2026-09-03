/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/coach": ["./player_weekly_master_2014_2025.csv.gz", "./current_rankings.csv"],
    "/api/players": ["./current_rankings.csv"]
  }
};
export default nextConfig;

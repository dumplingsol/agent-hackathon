/**
 * PM2 Ecosystem Configuration for SolRelay
 * 
 * Starts both the API server and the autonomous agent.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 logs solrelay
 *   pm2 status
 */

module.exports = {
  apps: [
    {
      name: 'solrelay-api',
      script: 'index-supabase.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: '3003',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/api-error.log',
      out_file: 'logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'solrelay-agent',
      script: 'autonomous-agent.js',
      instances: 1,  // IMPORTANT: Only one instance for single executor pattern
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        DRY_RUN: 'true',
      },
      env_production: {
        NODE_ENV: 'production',
        DRY_RUN: 'false',
      },
      error_file: 'logs/agent-error.log',
      out_file: 'logs/agent-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};

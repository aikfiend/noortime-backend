// PM2 ecosystem config — run on EC2 with: pm2 start ecosystem.config.cjs
// Environment variables must be set in /etc/environment or a .env file loaded separately.
module.exports = {
  apps: [
    {
      name: 'noortime-backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/var/log/services/noortime-backend/error.log',
      out_file: '/var/log/services/noortime-backend/out.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};

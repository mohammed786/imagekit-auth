module.exports = {
  apps: [
    {
      name: 'inquiry-api',
      script: 'app.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: './logs/inquiry-api-error.log',
      out_file: './logs/inquiry-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      ignore_watch: ['node_modules', 'logs'],
      listen_timeout: 3000,
      kill_timeout: 5000
    }
  ]
};
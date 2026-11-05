module.exports = {
  apps: [
    {
      name: 'kelsey',
      script: 'server/index.js',
      cwd: '/var/www/kelsey',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_PATH: '/var/www/kelsey/server/kelsey.db',
        CORS_ORIGIN: 'https://klc.lat,https://www.klc.lat',
      },
    },
  ],
};

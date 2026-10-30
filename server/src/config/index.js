require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  defaultVideoId: 'dQw4w9WgXcQ', // Default initial video
  driftThresholdSeconds: 1.5,
};

module.exports = config;

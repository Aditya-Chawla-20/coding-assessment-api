const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Coding Assessment API Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      ingest: 'POST /ingest',
      data: 'GET /data',
      health: 'GET /'
    }
  });
});

// API routes (direct endpoints as required)
app.use('/', apiRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: {
      ingest: 'POST /ingest',
      data: 'GET /data',
      health: 'GET /'
    }
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/`);
    console.log(`Ingest endpoint: http://localhost:${PORT}/ingest`);
    console.log(`Data endpoint: http://localhost:${PORT}/data`);
  });
}

module.exports = app;

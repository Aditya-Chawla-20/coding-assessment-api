const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const ingestionRoutes = require('./routes/ingestion');
const statusRoutes = require('./routes/status');
const errorHandler = require('./middleware/errorHandler');
const BatchProcessor = require('./services/batchProcessor');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize batch processor
const batchProcessor = new BatchProcessor();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Make batch processor available to routes
app.use((req, res, next) => {
  req.batchProcessor = batchProcessor;
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Data Ingestion API System',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      ingest: 'POST /ingest',
      status: 'GET /status/<ingestion_id>',
      health: 'GET /'
    },
    system_info: {
      queue_size: batchProcessor.getQueueSize(),
      active_batches: batchProcessor.getActiveBatches(),
      rate_limit: '3 IDs per 5 seconds'
    }
  });
});

// API routes
app.use('/', ingestionRoutes);
app.use('/', statusRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: {
      ingest: 'POST /ingest',
      status: 'GET /status/<ingestion_id>',
      health: 'GET /'
    }
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Data Ingestion API System running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/`);
    console.log(`📥 Ingest endpoint: http://localhost:${PORT}/ingest`);
    console.log(`📋 Status endpoint: http://localhost:${PORT}/status/<id>`);
    console.log(`⚡ Rate limit: 3 IDs per 5 seconds`);

    // Start the batch processor
    batchProcessor.start();
    console.log(`🔄 Batch processor started`);
  });
}

module.exports = app;

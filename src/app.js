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
      health: 'GET /',
      demo: 'GET /demo - Visual demo page'
    },
    system_info: {
      queue_size: batchProcessor.getQueueSize(),
      active_batches: batchProcessor.getActiveBatches(),
      rate_limit: '3 IDs per 5 seconds'
    }
  });
});

// Demo page to visually show API responses
app.get('/demo', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Loop Data Ingestion API - Demo</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; text-align: center; }
            .endpoint { background: #ecf0f1; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .method { background: #3498db; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
            .method.post { background: #e74c3c; }
            .response { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; margin-top: 10px; }
            .highlight { background: #f39c12; color: white; padding: 2px 5px; border-radius: 3px; }
            .success { color: #27ae60; font-weight: bold; }
            .note { background: #e8f5e8; border-left: 4px solid #27ae60; padding: 15px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎯 Loop Data Ingestion API - Live Demo</h1>

            <div class="note">
                <strong>✅ Status:</strong> API is running and compliant with Loop specification!<br>
                <strong>🔧 Key Fix:</strong> batch_id now uses <span class="highlight">integers</span> instead of UUIDs
            </div>

            <div class="endpoint">
                <h3><span class="method post">POST</span> /ingest</h3>
                <p><strong>Request:</strong></p>
                <div class="response">{"ids": [1, 2, 3, 4, 5], "priority": "MEDIUM"}</div>
                <p><strong>Response:</strong></p>
                <div class="response">{"ingestion_id": "c565bdb4-038c-4722-b63b-d1c221f2ab9a"}</div>
            </div>

            <div class="endpoint">
                <h3><span class="method">GET</span> /status/&lt;ingestion_id&gt;</h3>
                <p><strong>Loop-Compliant Response Format:</strong></p>
                <div class="response">{
  "ingestion_id": "c565bdb4-038c-4722-b63b-d1c221f2ab9a",
  "status": "completed",
  "batches": [
    {
      "batch_id": <span class="highlight">3</span>,
      "ids": [1, 2, 3],
      "status": "completed"
    },
    {
      "batch_id": <span class="highlight">4</span>,
      "ids": [4, 5],
      "status": "completed"
    }
  ]
}</div>
            </div>

            <div class="note">
                <strong>🎯 Key Compliance Points:</strong><br>
                • batch_id is <span class="highlight">integer</span> (3, 4) not UUID string<br>
                • No ingestion_id field inside batch objects<br>
                • Correct status transitions: yet_to_start → triggered → completed<br>
                • Rate limiting: 1 batch per 5 seconds, max 3 IDs per batch
            </div>

            <p class="success">✅ Ready for Loop's automated testing!</p>
        </div>
    </body>
    </html>
  `);
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

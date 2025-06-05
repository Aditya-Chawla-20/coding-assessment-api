const express = require('express');
const router = express.Router();

// GET /status/:ingestion_id - Get status of an ingestion request
router.get('/status/:ingestion_id', (req, res) => {
  try {
    const { ingestion_id } = req.params;
    const batchProcessor = req.batchProcessor;
    
    // Validate ingestion_id format (basic UUID validation)
    if (!ingestion_id || typeof ingestion_id !== 'string') {
      return res.status(400).json({
        error: 'Invalid ingestion_id',
        message: 'ingestion_id must be a valid string'
      });
    }

  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(ingestion_id)) {
    return res.status(400).json({
      error: 'Invalid ingestion_id',
      message: 'ingestion_id must be a valid UUID format'
    });
  }
    
    console.log(`📋 Status request for ingestion: ${ingestion_id}`);
    
    // Get status from batch processor
    const status = batchProcessor.getIngestionStatus(ingestion_id);
    
    if (!status) {
      return res.status(404).json({
        error: 'Ingestion not found',
        message: `No ingestion found with ID: ${ingestion_id}`
      });
    }
    
    // Return status
    res.json(status);
    
    console.log(`✅ Returned status for ${ingestion_id}: ${status.status}`);
    
  } catch (error) {
    console.error('Error getting ingestion status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve ingestion status'
    });
  }
});

// GET /status - Get all ingestions (for debugging/monitoring)
router.get('/status', (req, res) => {
  try {
    const batchProcessor = req.batchProcessor;
    
    // Get system overview
    const overview = {
      system_status: 'running',
      timestamp: new Date().toISOString(),
      queue_size: batchProcessor.getQueueSize(),
      active_batches: batchProcessor.getActiveBatches(),
      rate_limit_info: {
        max_ids_per_batch: 3,
        batch_interval_seconds: 5
      }
    };
    
    res.json(overview);
    
  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve system status'
    });
  }
});

module.exports = router;

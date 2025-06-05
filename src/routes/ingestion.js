const express = require('express');
const router = express.Router();

// Validation middleware for ingestion requests
const validateIngestionRequest = (req, res, next) => {
  const { ids, priority } = req.body;
  
  // Check if request body exists
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      error: 'Invalid request body',
      message: 'Request body must be a valid JSON object'
    });
  }
  
  // Validate ids array
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({
      error: 'Invalid ids',
      message: 'ids must be an array of integers'
    });
  }
  
  if (ids.length === 0) {
    return res.status(400).json({
      error: 'Empty ids array',
      message: 'ids array cannot be empty'
    });
  }
  
  // Validate each ID
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!Number.isInteger(id) || id < 1 || id > 1000000007) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: `ID at index ${i} must be an integer between 1 and 10^9+7 (1000000007). Got: ${id}`
      });
    }
  }
  
  // Validate priority (optional, defaults to MEDIUM)
  const validPriorities = ['HIGH', 'MEDIUM', 'LOW'];
  const requestPriority = priority || 'MEDIUM';
  
  if (!validPriorities.includes(requestPriority)) {
    return res.status(400).json({
      error: 'Invalid priority',
      message: `Priority must be one of: ${validPriorities.join(', ')}. Got: ${requestPriority}`
    });
  }
  
  // Add validated priority to request
  req.body.priority = requestPriority;
  
  next();
};

// POST /ingest - Main ingestion endpoint
router.post('/ingest', validateIngestionRequest, (req, res) => {
  try {
    const { ids, priority } = req.body;
    const batchProcessor = req.batchProcessor;
    
    console.log(`📥 Received ingestion request: ${ids.length} IDs with priority ${priority}`);
    
    // Create ingestion and get ID
    const ingestionId = batchProcessor.createIngestion(ids, priority);
    
    // Return ingestion ID immediately
    res.status(201).json({
      ingestion_id: ingestionId
    });
    
    console.log(`✅ Created ingestion ${ingestionId} for ${ids.length} IDs`);
    
  } catch (error) {
    console.error('Error creating ingestion:', error);
    
    if (error.message.includes('Invalid priority')) {
      return res.status(400).json({
        error: 'Invalid priority',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create ingestion request'
    });
  }
});

module.exports = router;

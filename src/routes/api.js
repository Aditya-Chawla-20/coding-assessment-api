const express = require('express');
const router = express.Router();

// In-memory storage for ingested data
let ingestedData = [];
let dataCounter = 0;

// Validation middleware for ingest endpoint
const validateIngestPayload = (req, res, next) => {
  const { body } = req;
  
  if (!body || typeof body !== 'object') {
    return res.status(400).json({
      error: 'Invalid payload',
      message: 'Request body must be a valid JSON object'
    });
  }
  
  // Basic validation - ensure it's not empty
  if (Object.keys(body).length === 0) {
    return res.status(400).json({
      error: 'Empty payload',
      message: 'Request body cannot be empty'
    });
  }
  
  next();
};

// POST /ingest - Main ingest endpoint as required
router.post('/ingest', validateIngestPayload, (req, res) => {
  try {
    const payload = req.body;
    const timestamp = new Date().toISOString();
    const id = ++dataCounter;
    
    // Process the payload (store with metadata)
    const processedData = {
      id,
      timestamp,
      originalPayload: payload,
      processed: true,
      size: JSON.stringify(payload).length
    };
    
    // Store the data
    ingestedData.push(processedData);
    
    // Keep only last 1000 entries to prevent memory issues
    if (ingestedData.length > 1000) {
      ingestedData = ingestedData.slice(-1000);
    }
    
    // Return success response
    res.status(201).json({
      success: true,
      message: 'Data ingested successfully',
      id,
      timestamp,
      dataSize: processedData.size,
      totalRecords: ingestedData.length
    });
    
  } catch (error) {
    console.error('Error processing ingest request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process the ingested data'
    });
  }
});

// GET /data - Retrieve ingested data (second endpoint)
router.get('/data', (req, res) => {
  try {
    const { limit = 10, offset = 0, id } = req.query;
    
    // If specific ID requested
    if (id) {
      const record = ingestedData.find(item => item.id === parseInt(id));
      if (!record) {
        return res.status(404).json({
          error: 'Record not found',
          message: `No record found with ID ${id}`
        });
      }
      return res.json(record);
    }
    
    // Pagination
    const limitNum = Math.min(parseInt(limit) || 10, 100); // Max 100 per request
    const offsetNum = parseInt(offset) || 0;
    
    const paginatedData = ingestedData
      .slice()
      .reverse() // Most recent first
      .slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      data: paginatedData,
      pagination: {
        total: ingestedData.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < ingestedData.length
      },
      meta: {
        totalRecords: ingestedData.length,
        oldestRecord: ingestedData.length > 0 ? ingestedData[0].timestamp : null,
        newestRecord: ingestedData.length > 0 ? ingestedData[ingestedData.length - 1].timestamp : null
      }
    });
    
  } catch (error) {
    console.error('Error retrieving data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve data'
    });
  }
});

// GET /data/stats - Statistics endpoint
router.get('/data/stats', (req, res) => {
  try {
    const totalRecords = ingestedData.length;
    const totalSize = ingestedData.reduce((sum, item) => sum + item.size, 0);
    const avgSize = totalRecords > 0 ? Math.round(totalSize / totalRecords) : 0;
    
    res.json({
      totalRecords,
      totalSize,
      averageSize: avgSize,
      oldestRecord: totalRecords > 0 ? ingestedData[0].timestamp : null,
      newestRecord: totalRecords > 0 ? ingestedData[totalRecords - 1].timestamp : null
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve statistics'
    });
  }
});

module.exports = router;

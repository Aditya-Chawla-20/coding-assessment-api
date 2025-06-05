const { v4: uuidv4 } = require('uuid');

class BatchProcessor {
  constructor() {
    // Priority queue for batches (higher priority first, then by creation time)
    this.batchQueue = [];

    // Storage for ingestion requests and their batches
    this.ingestions = new Map();
    this.batches = new Map();

    // Rate limiting: max 3 IDs per 5 seconds
    this.isProcessing = false;
    this.lastProcessTime = 0;
    this.RATE_LIMIT_INTERVAL = 5000; // 5 seconds
    this.MAX_BATCH_SIZE = 3;
    this.processingTimeout = null;

    // Priority levels for sorting
    this.PRIORITY_LEVELS = {
      'HIGH': 3,
      'MEDIUM': 2,
      'LOW': 1
    };

    // Auto-start processing
    this.start();
  }

  /**
   * Create a new ingestion request and split into batches
   */
  createIngestion(ids, priority = 'MEDIUM') {
    const ingestionId = uuidv4();
    const createdAt = Date.now();
    
    // Validate priority
    if (!this.PRIORITY_LEVELS[priority]) {
      throw new Error(`Invalid priority: ${priority}. Must be HIGH, MEDIUM, or LOW`);
    }
    
    // Create batches of max 3 IDs each
    const batches = [];
    for (let i = 0; i < ids.length; i += this.MAX_BATCH_SIZE) {
      const batchIds = ids.slice(i, i + this.MAX_BATCH_SIZE);
      const batchId = uuidv4();
      
      const batch = {
        batch_id: batchId,
        ingestion_id: ingestionId,
        ids: batchIds,
        status: 'yet_to_start',
        priority,
        created_at: createdAt,
        started_at: null,
        completed_at: null,
        results: []
      };
      
      batches.push(batch);
      this.batches.set(batchId, batch);
      
      // Add to priority queue
      this.addBatchToQueue(batch);
    }
    
    // Store ingestion metadata
    const ingestion = {
      ingestion_id: ingestionId,
      original_ids: ids,
      priority,
      created_at: createdAt,
      batch_ids: batches.map(b => b.batch_id),
      status: 'yet_to_start'
    };
    
    this.ingestions.set(ingestionId, ingestion);
    
    console.log(`📥 Created ingestion ${ingestionId} with ${batches.length} batches (priority: ${priority})`);
    
    return ingestionId;
  }

  /**
   * Add batch to priority queue maintaining order
   */
  addBatchToQueue(batch) {
    this.batchQueue.push(batch);
    
    // Sort by priority (descending) then by creation time (ascending)
    this.batchQueue.sort((a, b) => {
      const priorityDiff = this.PRIORITY_LEVELS[b.priority] - this.PRIORITY_LEVELS[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.created_at - b.created_at;
    });
    
    console.log(`📋 Added batch ${batch.batch_id} to queue. Queue size: ${this.batchQueue.length}`);
  }

  /**
   * Get status of an ingestion request
   */
  getIngestionStatus(ingestionId) {
    const ingestion = this.ingestions.get(ingestionId);
    if (!ingestion) {
      return null;
    }
    
    // Get all batches for this ingestion
    const batches = ingestion.batch_ids.map(batchId => {
      const batch = this.batches.get(batchId);
      return {
        batch_id: batch.batch_id,
        ids: batch.ids,
        ingestion_id: ingestionId,
        status: batch.status
      };
    });
    
    // Calculate overall status
    const batchStatuses = batches.map(b => b.status);
    let overallStatus;
    
    if (batchStatuses.every(status => status === 'yet_to_start')) {
      overallStatus = 'yet_to_start';
    } else if (batchStatuses.every(status => status === 'completed')) {
      overallStatus = 'completed';
    } else {
      overallStatus = 'triggered';
    }
    
    return {
      ingestion_id: ingestionId,
      status: overallStatus,
      batches
    };
  }

  /**
   * Start the batch processor
   */
  start() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processNextBatch();
  }

  /**
   * Process the next batch in the queue
   */
  async processNextBatch() {
    if (!this.isProcessing) return;

    // Clear any existing timeout
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }

    // Check rate limit
    const now = Date.now();
    const timeSinceLastProcess = now - this.lastProcessTime;

    if (timeSinceLastProcess < this.RATE_LIMIT_INTERVAL && this.lastProcessTime > 0) {
      const waitTime = this.RATE_LIMIT_INTERVAL - timeSinceLastProcess;
      console.log(`⏳ Rate limit: waiting ${waitTime}ms before next batch`);
      this.processingTimeout = setTimeout(() => this.processNextBatch(), waitTime);
      return;
    }

    // Get next batch from queue
    const batch = this.batchQueue.shift();
    if (!batch) {
      // No batches to process, check again in 1 second
      this.processingTimeout = setTimeout(() => this.processNextBatch(), 1000);
      return;
    }

    // Process the batch
    await this.processBatch(batch);

    // Update last process time
    this.lastProcessTime = Date.now();

    // Schedule next batch
    this.processingTimeout = setTimeout(() => this.processNextBatch(), this.RATE_LIMIT_INTERVAL);
  }

  /**
   * Process a single batch
   */
  async processBatch(batch) {
    console.log(`🔄 Processing batch ${batch.batch_id} with IDs: [${batch.ids.join(', ')}]`);
    
    // Update batch status to triggered
    batch.status = 'triggered';
    batch.started_at = Date.now();
    
    try {
      // Simulate external API calls for each ID
      const results = [];
      for (const id of batch.ids) {
        const result = await this.simulateExternalAPICall(id);
        results.push(result);
      }
      
      // Update batch with results
      batch.results = results;
      batch.status = 'completed';
      batch.completed_at = Date.now();
      
      console.log(`✅ Completed batch ${batch.batch_id}`);
      
    } catch (error) {
      console.error(`❌ Error processing batch ${batch.batch_id}:`, error);
      batch.status = 'failed';
      batch.error = error.message;
    }
  }

  /**
   * Simulate external API call with delay
   */
  async simulateExternalAPICall(id) {
    // Simulate network delay (100-500ms per ID)
    const delay = Math.random() * 400 + 100;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return {
      id: id,
      data: "processed",
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get current queue size
   */
  getQueueSize() {
    return this.batchQueue.length;
  }

  /**
   * Get number of active batches
   */
  getActiveBatches() {
    return Array.from(this.batches.values()).filter(b => b.status === 'triggered').length;
  }

  /**
   * Stop the processor
   */
  stop() {
    this.isProcessing = false;
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
  }
}

module.exports = BatchProcessor;

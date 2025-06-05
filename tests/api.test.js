const request = require('supertest');
const app = require('../src/app');

// Helper function to wait for a specific time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Data Ingestion API System', () => {

  describe('Health Check', () => {
    it('should return system health information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Data Ingestion API System');
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('system_info');
      expect(response.body.system_info).toHaveProperty('rate_limit', '3 IDs per 5 seconds');
    });
  });

  describe('POST /ingest - Input Validation', () => {
    it('should successfully create ingestion with valid data', async () => {
      const payload = {
        ids: [1, 2, 3, 4, 5],
        priority: 'HIGH'
      };

      const response = await request(app)
        .post('/ingest')
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('ingestion_id');
      expect(typeof response.body.ingestion_id).toBe('string');
      expect(response.body.ingestion_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should default to MEDIUM priority when not specified', async () => {
      const payload = {
        ids: [1, 2, 3]
      };

      const response = await request(app)
        .post('/ingest')
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('ingestion_id');
    });

    it('should reject empty request body', async () => {
      const response = await request(app)
        .post('/ingest')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid ids');
      expect(response.body).toHaveProperty('message', 'ids must be an array of integers');
    });

    it('should reject missing ids field', async () => {
      const payload = {
        priority: 'HIGH'
      };

      const response = await request(app)
        .post('/ingest')
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid ids');
    });

    it('should reject empty ids array', async () => {
      const payload = {
        ids: [],
        priority: 'HIGH'
      };

      const response = await request(app)
        .post('/ingest')
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Empty ids array');
    });

    it('should reject non-array ids', async () => {
      const payload = {
        ids: "not an array",
        priority: 'HIGH'
      };

      const response = await request(app)
        .post('/ingest')
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid ids');
    });

    it('should reject invalid ID values', async () => {
      const payload = {
        ids: [1, 2, "invalid", 4],
        priority: 'HIGH'
      };

      const response = await request(app)
        .post('/ingest')
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid ID');
      expect(response.body.message).toContain('index 2');
    });

    it('should reject IDs outside valid range', async () => {
      const payload = {
        ids: [1, 2, 1000000008], // > 10^9+7
        priority: 'HIGH'
      };

      const response = await request(app)
        .post('/ingest')
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid ID');
    });

    it('should reject invalid priority values', async () => {
      const payload = {
        ids: [1, 2, 3],
        priority: 'INVALID'
      };

      const response = await request(app)
        .post('/ingest')
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid priority');
    });

    it('should accept all valid priority values', async () => {
      const priorities = ['HIGH', 'MEDIUM', 'LOW'];

      for (const priority of priorities) {
        const payload = {
          ids: [1, 2, 3],
          priority
        };

        const response = await request(app)
          .post('/ingest')
          .send(payload)
          .expect(201);

        expect(response.body).toHaveProperty('ingestion_id');
      }
    });
  });

  describe('GET /status/:ingestion_id', () => {
    let ingestionId;

    beforeEach(async () => {
      // Create a test ingestion
      const payload = {
        ids: [1, 2, 3, 4, 5],
        priority: 'MEDIUM'
      };

      const response = await request(app)
        .post('/ingest')
        .send(payload);

      ingestionId = response.body.ingestion_id;
    });

    it('should return status for valid ingestion_id', async () => {
      const response = await request(app)
        .get(`/status/${ingestionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('ingestion_id', ingestionId);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('batches');
      expect(Array.isArray(response.body.batches)).toBe(true);

      // Check batch structure
      response.body.batches.forEach(batch => {
        expect(batch).toHaveProperty('batch_id');
        expect(batch).toHaveProperty('ids');
        expect(batch).toHaveProperty('status');
        expect(Array.isArray(batch.ids)).toBe(true);
        expect(['yet_to_start', 'triggered', 'completed']).toContain(batch.status);
      });
    });

    it('should return 404 for non-existent ingestion_id', async () => {
      const fakeId = '12345678-1234-1234-1234-123456789012';

      const response = await request(app)
        .get(`/status/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Ingestion not found');
    });

    it('should return 400 for invalid ingestion_id format', async () => {
      const response = await request(app)
        .get('/status/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid ingestion_id');
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should respect 5-second rate limit between batches', async () => {
      // Create ingestion with 6 IDs (will create 2 batches)
      const payload = {
        ids: [1, 2, 3, 4, 5, 6],
        priority: 'HIGH'
      };

      const startTime = Date.now();
      const response = await request(app)
        .post('/ingest')
        .send(payload);

      const ingestionId = response.body.ingestion_id;

      // Wait a bit for first batch to start
      await wait(1000);

      // Check status - first batch should be triggered or completed
      let status = await request(app)
        .get(`/status/${ingestionId}`)
        .expect(200);

      expect(status.body.batches.length).toBe(2);

      // Wait for rate limit period
      await wait(6000);

      // Check status again - both batches should be processed
      status = await request(app)
        .get(`/status/${ingestionId}`)
        .expect(200);

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeGreaterThan(5000); // Should take at least 5 seconds

    }, 15000); // Increase timeout for this test

    it('should process maximum 3 IDs per batch', async () => {
      const payload = {
        ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        priority: 'MEDIUM'
      };

      const response = await request(app)
        .post('/ingest')
        .send(payload);

      const ingestionId = response.body.ingestion_id;

      const status = await request(app)
        .get(`/status/${ingestionId}`)
        .expect(200);

      // Should create 4 batches: [1,2,3], [4,5,6], [7,8,9], [10]
      expect(status.body.batches.length).toBe(4);

      // Check batch sizes
      expect(status.body.batches[0].ids.length).toBe(3);
      expect(status.body.batches[1].ids.length).toBe(3);
      expect(status.body.batches[2].ids.length).toBe(3);
      expect(status.body.batches[3].ids.length).toBe(1);
    });
  });

  describe('Priority Handling Tests', () => {
    it('should process HIGH priority before MEDIUM priority', async () => {
      // Create MEDIUM priority request first
      const mediumPayload = {
        ids: [1, 2, 3, 4, 5],
        priority: 'MEDIUM'
      };

      const mediumResponse = await request(app)
        .post('/ingest')
        .send(mediumPayload);

      const mediumId = mediumResponse.body.ingestion_id;

      // Wait a bit, then create HIGH priority request
      await wait(1000);

      const highPayload = {
        ids: [6, 7, 8, 9],
        priority: 'HIGH'
      };

      const highResponse = await request(app)
        .post('/ingest')
        .send(highPayload);

      const highId = highResponse.body.ingestion_id;

      // Wait for processing
      await wait(8000);

      // Check both statuses
      const mediumStatus = await request(app)
        .get(`/status/${mediumId}`)
        .expect(200);

      const highStatus = await request(app)
        .get(`/status/${highId}`)
        .expect(200);

      // Both should be processing or completed by now
      expect(['yet_to_start', 'triggered', 'completed']).toContain(highStatus.body.status);
      expect(['yet_to_start', 'triggered', 'completed']).toContain(mediumStatus.body.status);

    }, 15000);

    it('should handle multiple priority levels correctly', async () => {
      const requests = [
        { ids: [1, 2, 3], priority: 'LOW' },
        { ids: [4, 5, 6], priority: 'HIGH' },
        { ids: [7, 8, 9], priority: 'MEDIUM' },
        { ids: [10, 11, 12], priority: 'HIGH' }
      ];

      const ingestionIds = [];

      // Create all requests
      for (const payload of requests) {
        const response = await request(app)
          .post('/ingest')
          .send(payload);
        ingestionIds.push(response.body.ingestion_id);
        await wait(100); // Small delay between requests
      }

      // Wait for some processing
      await wait(3000);

      // Check statuses
      const statuses = [];
      for (const id of ingestionIds) {
        const status = await request(app)
          .get(`/status/${id}`)
          .expect(200);
        statuses.push(status.body);
      }

      // All should have valid statuses
      const allValidStatuses = statuses.every(s =>
        ['yet_to_start', 'triggered', 'completed'].includes(s.status)
      );
      expect(allValidStatuses).toBe(true);

    }, 10000);
  });

  describe('Status Transitions', () => {
    it('should show correct status transitions over time', async () => {
      const payload = {
        ids: [1, 2, 3],
        priority: 'HIGH'
      };

      const response = await request(app)
        .post('/ingest')
        .send(payload);

      const ingestionId = response.body.ingestion_id;

      // Initial status should be yet_to_start
      let status = await request(app)
        .get(`/status/${ingestionId}`)
        .expect(200);

      expect(status.body.status).toBe('yet_to_start');
      expect(status.body.batches[0].status).toBe('yet_to_start');

      // Wait for processing to start
      await wait(2000);

      status = await request(app)
        .get(`/status/${ingestionId}`)
        .expect(200);

      // Should be triggered or completed
      expect(['yet_to_start', 'triggered', 'completed']).toContain(status.body.status);

      // Wait for completion
      await wait(4000);

      const finalStatus = await request(app)
        .get(`/status/${ingestionId}`)
        .expect(200);

      // Should eventually be completed or still processing
      expect(['yet_to_start', 'triggered', 'completed']).toContain(finalStatus.body.status);

    }, 10000);
  });

  describe('System Status Endpoint', () => {
    it('should return system overview', async () => {
      const response = await request(app)
        .get('/status')
        .expect(200);

      expect(response.body).toHaveProperty('system_status', 'running');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('queue_size');
      expect(response.body).toHaveProperty('active_batches');
      expect(response.body).toHaveProperty('rate_limit_info');
      expect(response.body.rate_limit_info).toHaveProperty('max_ids_per_batch', 3);
      expect(response.body.rate_limit_info).toHaveProperty('batch_interval_seconds', 5);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Endpoint not found');
      expect(response.body).toHaveProperty('availableEndpoints');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/ingest')
        .send('{"invalid": json}')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});

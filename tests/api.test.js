const request = require('supertest');
const app = require('../src/app');

describe('API Endpoints', () => {
  describe('GET /', () => {
    it('should return health check information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('POST /ingest', () => {
    it('should successfully ingest valid JSON data', async () => {
      const testPayload = {
        name: 'Test User',
        email: 'test@example.com',
        age: 25
      };

      const response = await request(app)
        .post('/ingest')
        .send(testPayload)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Data ingested successfully');
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('dataSize');
      expect(response.body).toHaveProperty('totalRecords');
    });

    it('should handle complex nested JSON data', async () => {
      const complexPayload = {
        user: {
          profile: {
            name: 'John Doe',
            preferences: {
              theme: 'dark',
              notifications: true
            }
          },
          activities: [
            { type: 'login', timestamp: '2023-01-01T00:00:00Z' },
            { type: 'purchase', timestamp: '2023-01-02T00:00:00Z' }
          ]
        },
        metadata: {
          source: 'api',
          version: '1.0'
        }
      };

      const response = await request(app)
        .post('/ingest')
        .send(complexPayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.dataSize).toBeGreaterThan(0);
    });

    it('should reject empty payload', async () => {
      const response = await request(app)
        .post('/ingest')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Empty payload');
      expect(response.body).toHaveProperty('message', 'Request body cannot be empty');
    });

    it('should reject invalid JSON', async () => {
      const response = await request(app)
        .post('/ingest')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle large payloads', async () => {
      const largePayload = {
        data: Array(1000).fill().map((_, i) => ({
          id: i,
          value: `item-${i}`,
          timestamp: new Date().toISOString()
        }))
      };

      const response = await request(app)
        .post('/ingest')
        .send(largePayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.dataSize).toBeGreaterThan(10000);
    });
  });

  describe('GET /data', () => {
    beforeEach(async () => {
      // Ingest some test data
      await request(app)
        .post('/ingest')
        .send({ test: 'data1', value: 1 });
      
      await request(app)
        .post('/ingest')
        .send({ test: 'data2', value: 2 });
    });

    it('should retrieve ingested data with pagination', async () => {
      const response = await request(app)
        .get('/data')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/data?limit=1&offset=0')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should retrieve specific record by ID', async () => {
      // First ingest data to get an ID
      const ingestResponse = await request(app)
        .post('/ingest')
        .send({ specific: 'test' });

      const recordId = ingestResponse.body.id;

      const response = await request(app)
        .get(`/data?id=${recordId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', recordId);
      expect(response.body).toHaveProperty('originalPayload');
      expect(response.body.originalPayload).toHaveProperty('specific', 'test');
    });

    it('should return 404 for non-existent record ID', async () => {
      const response = await request(app)
        .get('/data?id=99999')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Record not found');
    });
  });

  describe('GET /data/stats', () => {
    it('should return statistics about ingested data', async () => {
      const response = await request(app)
        .get('/data/stats')
        .expect(200);

      expect(response.body).toHaveProperty('totalRecords');
      expect(response.body).toHaveProperty('totalSize');
      expect(response.body).toHaveProperty('averageSize');
      expect(typeof response.body.totalRecords).toBe('number');
      expect(typeof response.body.totalSize).toBe('number');
      expect(typeof response.body.averageSize).toBe('number');
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
  });
});

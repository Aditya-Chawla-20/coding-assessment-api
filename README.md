# Coding Assessment API Service

A REST API service built for coding assessment with data ingestion capabilities.

## Features

- **POST /ingest** - Main endpoint for data ingestion
- **GET /data** - Retrieve ingested data with pagination
- **GET /data/stats** - Get statistics about ingested data
- **GET /** - Health check endpoint

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coding-assessment-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Start the production server**
   ```bash
   npm start
   ```

The server will start on port 3000 (or the port specified in the PORT environment variable).

### Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run tests in watch mode:
```bash
npm run test:watch
```

## API Endpoints

### Health Check
- **GET /** - Returns service status and available endpoints

### Data Ingestion
- **POST /ingest**
  - Accepts JSON payload in request body
  - Returns success confirmation with metadata
  - Validates payload format and content

Example request:
```bash
curl -X POST https://your-service.herokuapp.com/ingest \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "age": 30}'
```

Example response:
```json
{
  "success": true,
  "message": "Data ingested successfully",
  "id": 1,
  "timestamp": "2023-12-07T10:30:00.000Z",
  "dataSize": 58,
  "totalRecords": 1
}
```

### Data Retrieval
- **GET /data**
  - Returns paginated list of ingested data
  - Query parameters:
    - `limit` (default: 10, max: 100) - Number of records per page
    - `offset` (default: 0) - Number of records to skip
    - `id` - Retrieve specific record by ID

Example request:
```bash
curl https://your-service.herokuapp.com/data?limit=5&offset=0
```

Example response:
```json
{
  "data": [
    {
      "id": 1,
      "timestamp": "2023-12-07T10:30:00.000Z",
      "originalPayload": {"name": "John Doe", "email": "john@example.com"},
      "processed": true,
      "size": 58
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 5,
    "offset": 0,
    "hasMore": false
  },
  "meta": {
    "totalRecords": 1,
    "oldestRecord": "2023-12-07T10:30:00.000Z",
    "newestRecord": "2023-12-07T10:30:00.000Z"
  }
}
```

### Statistics
- **GET /data/stats**
  - Returns statistics about ingested data

Example response:
```json
{
  "totalRecords": 100,
  "totalSize": 5800,
  "averageSize": 58,
  "oldestRecord": "2023-12-07T10:00:00.000Z",
  "newestRecord": "2023-12-07T10:30:00.000Z"
}
```

## Error Handling

The API returns appropriate HTTP status codes:

- **200** - Success
- **201** - Created (successful ingestion)
- **400** - Bad Request (invalid payload)
- **404** - Not Found (endpoint or record not found)
- **500** - Internal Server Error

Error responses include descriptive messages:
```json
{
  "error": "Invalid payload",
  "message": "Request body must be a valid JSON object"
}
```

## Deployment

### Heroku Deployment

1. **Install Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Or download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```

4. **Deploy**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push heroku main
   ```

5. **Open your app**
   ```bash
   heroku open
   ```

### Environment Variables

The service uses the following environment variables:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

Set environment variables on Heroku:
```bash
heroku config:set NODE_ENV=production
```

## Technical Details

### Architecture
- **Framework**: Express.js
- **Storage**: In-memory (for simplicity)
- **Testing**: Jest with Supertest
- **Security**: Helmet.js for security headers
- **CORS**: Enabled for cross-origin requests

### Data Storage
- Data is stored in memory for this assessment
- Automatic cleanup keeps only the last 1000 records
- Each record includes metadata (ID, timestamp, size)

### Performance Considerations
- Request size limit: 10MB
- Pagination for data retrieval
- Memory management for large datasets

## Development

### Project Structure
```
├── src/
│   ├── app.js              # Main application
│   ├── routes/
│   │   └── api.js          # API routes
│   └── middleware/
│       └── errorHandler.js # Error handling
├── tests/
│   └── api.test.js         # Test suite
├── package.json            # Dependencies and scripts
├── Procfile               # Heroku deployment
└── README.md              # This file
```

### Adding Features
1. Add new routes in `src/routes/api.js`
2. Add corresponding tests in `tests/api.test.js`
3. Update this README with new endpoint documentation

## License

ISC

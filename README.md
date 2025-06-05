# Data Ingestion API System

A sophisticated REST API system for data ingestion with priority-based batch processing, rate limiting, and asynchronous job processing.

## 🚀 Features

- **Priority-based job queue** with HIGH, MEDIUM, LOW priorities
- **Rate limiting**: Maximum 3 IDs processed per 5-second interval
- **Asynchronous batch processing** with real-time status tracking
- **Intelligent scheduling** based on priority and creation time
- **Comprehensive validation** and error handling
- **Extensive test coverage** with timing verification

## 📋 API Endpoints

### 1. Data Ingestion
**POST /ingest**

Submit a data ingestion request with a list of IDs and priority level.

**Request Format:**
```json
{
  "ids": [1, 2, 3, 4, 5],
  "priority": "HIGH"
}
```

**Parameters:**
- `ids` (required): Array of integers (1 to 10^9+7)
- `priority` (optional): "HIGH", "MEDIUM", or "LOW" (defaults to "MEDIUM")

**Response:**
```json
{
  "ingestion_id": "abc123-def456-ghi789"
}
```

### 2. Status Checking
**GET /status/{ingestion_id}**

Check the processing status of an ingestion request.

**Response:**
```json
{
  "ingestion_id": "abc123-def456-ghi789",
  "status": "triggered",
  "batches": [
    {
      "batch_id": "batch-uuid-1",
      "ids": [1, 2, 3],
      "status": "completed"
    },
    {
      "batch_id": "batch-uuid-2",
      "ids": [4, 5],
      "status": "triggered"
    }
  ]
}
```

**Status Values:**
- **Batch Level**: `yet_to_start`, `triggered`, `completed`
- **Overall Status**:
  - `yet_to_start`: All batches are yet to start
  - `triggered`: At least one batch is triggered
  - `completed`: All batches are completed

### 3. System Health
**GET /**

Returns system health and configuration information.

**Response:**
```json
{
  "message": "Data Ingestion API System",
  "status": "healthy",
  "timestamp": "2025-06-04T13:07:12.615Z",
  "endpoints": {
    "ingest": "POST /ingest",
    "status": "GET /status/<ingestion_id>",
    "health": "GET /"
  },
  "system_info": {
    "queue_size": 5,
    "active_batches": 2,
    "rate_limit": "3 IDs per 5 seconds"
  }
}
```

## 🔧 Quick Start

### Local Development

1. **Clone and install**
   ```bash
   git clone https://github.com/Aditya-Chawla-20/data-ingestion-api.git
   cd data-ingestion-api
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Start production server**
   ```bash
   npm start
   ```

The server runs on port 3000 by default.

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🏗️ System Architecture

### Core Components

1. **BatchProcessor Service**
   - Priority queue management
   - Rate limiting enforcement
   - Asynchronous batch processing
   - Status tracking

2. **Ingestion Routes**
   - Input validation
   - Request handling
   - Error management

3. **Status Routes**
   - Real-time status retrieval
   - System monitoring

### Processing Logic

1. **Batch Creation**: IDs are split into batches of maximum 3 IDs each
2. **Priority Queuing**: Batches are queued by priority (HIGH > MEDIUM > LOW) then by creation time
3. **Rate Limited Processing**: Only one batch processes every 5 seconds
4. **Status Updates**: Real-time status tracking throughout the process

### Example Processing Timeline

```
Request 1 - T0 - {"ids": [1,2,3,4,5], "priority": "MEDIUM"}
Request 2 - T4 - {"ids": [6,7,8,9], "priority": "HIGH"}

T0-T5:   Process [1,2,3] (MEDIUM, first batch)
T5-T10:  Process [6,7,8] (HIGH, higher priority)
T10-T15: Process [9,4,5] (remaining HIGH, then MEDIUM)
```

## 🧪 Testing Strategy

The test suite includes:

- **Input Validation Tests**: All edge cases and error conditions
- **Rate Limiting Verification**: Timing-based tests ensuring 5-second intervals
- **Priority Handling Tests**: Verification of correct priority ordering
- **Status Transition Tests**: Real-time status change verification
- **System Integration Tests**: End-to-end workflow testing

### Running Specific Test Categories

```bash
# Run with verbose output
npm test -- --verbose

# Run specific test file
npm test tests/api.test.js

# Run tests matching pattern
npm test -- --testNamePattern="Priority"
```

## 🚀 Deployment

### Render.com (Recommended)

1. **Connect GitHub repository** to Render.com
2. **Configure build settings**:
   - Build Command: `npm install`
   - Start Command: `npm start`
3. **Deploy** and get public URL

### Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

## 📊 Performance Characteristics

- **Throughput**: 3 IDs per 5 seconds (rate limited)
- **Batch Size**: Maximum 3 IDs per batch
- **Memory Usage**: In-memory storage with efficient data structures
- **Response Time**: Sub-100ms for API endpoints
- **Concurrency**: Asynchronous processing with single-threaded rate limiting

## 🔍 Monitoring and Debugging

### System Status Endpoint
**GET /status** provides system overview:
- Current queue size
- Active batch count
- Rate limiting information

### Logging
The system provides detailed console logging:
- 📥 Ingestion requests
- 🔄 Batch processing
- ✅ Completion status
- ❌ Error conditions

## 🛠️ Development

### Project Structure
```
├── src/
│   ├── app.js                 # Main application
│   ├── services/
│   │   └── batchProcessor.js  # Core processing logic
│   ├── routes/
│   │   ├── ingestion.js       # Ingestion endpoints
│   │   └── status.js          # Status endpoints
│   └── middleware/
│       └── errorHandler.js    # Error handling
├── tests/
│   └── api.test.js           # Comprehensive test suite
├── package.json              # Dependencies and scripts
├── Procfile                  # Deployment configuration
└── README.md                 # This documentation
```

### Key Design Decisions

1. **In-Memory Storage**: Chosen for simplicity and fast access
2. **Priority Queue**: Custom implementation for precise control
3. **Rate Limiting**: Timer-based approach for accurate intervals
4. **UUID Generation**: For unique, collision-free identifiers
5. **Comprehensive Testing**: Timing-based tests for rate limiting verification

## 📝 API Examples

### Basic Ingestion
```bash
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{"ids": [1, 2, 3, 4, 5], "priority": "HIGH"}'
```

### Status Check
```bash
curl http://localhost:3000/status/abc123-def456-ghi789
```

### System Health
```bash
curl http://localhost:3000/
```

## 🔒 Security Features

- **Input Validation**: Comprehensive validation of all inputs
- **Rate Limiting**: Built-in protection against abuse
- **Error Handling**: Secure error messages without information leakage
- **CORS**: Configurable cross-origin resource sharing
- **Helmet.js**: Security headers for production deployment

## 📈 Scalability Considerations

For production scaling:
- Replace in-memory storage with Redis/Database
- Implement distributed job queues (Bull, Agenda)
- Add horizontal scaling with load balancers
- Implement persistent storage for job recovery
- Add monitoring and alerting systems

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

ISC

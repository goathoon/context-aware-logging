db = db.getSiblingDB('wide_events')

// Create user for the application
db.createUser({
  user: 'eventsAdmin',
  pwd: 'eventsAdmin',
  roles: [{ role: 'readWrite', db: 'wide_events' }],
})

// Create Wide Events collection with Time-series and Validation
db.createCollection('wide_events', {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'service',
    granularity: 'seconds',
  },
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['requestId', 'timestamp', 'service', 'route'],
      properties: {
        requestId: { bsonType: 'string' },
        timestamp: { bsonType: 'date' },
        service: { bsonType: 'string' },
        route: { bsonType: 'string' },
        user: {
          bsonType: 'object',
          properties: {
            id: { bsonType: 'string' },
            role: { bsonType: 'string' },
          },
        },
        error: {
          bsonType: 'object',
          properties: {
            code: { bsonType: 'string' },
            message: { bsonType: 'string' },
          },
        },
        performance: {
          bsonType: 'object',
          properties: {
            durationMs: { bsonType: 'number' },
          },
        },
      },
    },
  },
})

// Phase 2 Index Strategy
db.wide_events.createIndex({ requestId: 1 })
db.wide_events.createIndex({ 'user.id': 1 })
db.wide_events.createIndex({ 'error.code': 1 })

// TTL Strategy: 30 days retention (30 * 24 * 60 * 60 seconds)
db.wide_events.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 })

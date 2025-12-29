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
})

// Phase 2 Index Strategy
db.wide_events.createIndexes([
  { name: 'requestId_index', fields: [{ requestId: 1 }] },
  { name: 'timestamp_index', fields: [{ timestamp: 1 }] },
  { name: 'service_index', fields: [{ service: 1 }] },
])

// Phase 3 Strategy
// Create High Water Mark Collection
// For Tracking Embedding Progress
db.createCollection('embedding_progress', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['source', 'lastEmbeddedEventId', 'lastEmbeddedEventTimestamp'],
      properties: {
        source: {
          bsonType: 'string',
          description: 'Source collection name (e.g. wide_events)',
        },
        lastEmbeddedEventId: {
          bsonType: 'objectId',
          description: 'Last embedded WideEvent _id (ObjectID)',
        },
        lastEmbeddedEventTimestamp: {
          bsonType: 'date',
          description: 'Timestamp of the last embedded WideEvent (ISO string)',
        },
        lastUpdatedAt: {
          bsonType: 'date',
          description: 'Timestamp of the last update (ISO string)',
        },
      },
    },
  },
})

// Embedded Results Collection
db.createCollection('wide_events_embedded', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['eventId', 'summary', 'model', 'embedding', 'createdAt'],
      properties: {
        eventId: {
          bsonType: 'objectId',
          description: 'WideEvent eventId (ObjectID)',
        },
        summary: {
          bsonType: 'string',
          description: 'Summary of the WideEvent',
        },
        model: {
          bsonType: 'string',
          description: 'Model used to embed the WideEvent',
        },
        embedding: {
          bsonType: 'array',
          description: 'Embedding of the WideEvent',
          items: {
            bsonType: 'number',
            description: 'Embedding element',
          },
        },
        createdAt: {
          bsonType: 'date',
          description:
            'Timestamp of the WideEvent embedding creation (ISO string)',
        },
      },
    },
  },
})

db.wide_events_embedded.createSearchIndexes([
  {
    name: 'embedding_index',
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          type: 'vector',
          path: 'embedding',
          numDimensions: 512,
          similarity: 'cosine',
        },
        {
          type: 'filter',
          path: 'eventId',
        },
        {
          type: 'filter',
          path: 'createdAt',
        },
      ],
    },
  },
])

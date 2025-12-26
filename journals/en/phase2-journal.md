# Phase 2 Retrospective: Persisting Logs as Data Assets (MongoDB)

## 1. Overview

The core objective of Phase 2 was to transform logs from simple text files into **"queryable data assets."** To achieve this, we replaced the infrastructure layer from files to MongoDB and aimed to lay the architectural foundation for efficiently managing large-scale log data.

## 2. Key Themes & Challenges

- **Storage Optimization**: Introduced MongoDB Time-series collections optimized for log data characteristics (chronological order, write-heavy).
- **Architectural Integrity**: Maintained Hexagonal Architecture, swapping infrastructure adapters without modifying business logic.
- **Data Reliability**: Ensured the quality of persisted log data through runtime type checking and validation (`class-validator`).
- **Operational Efficiency**: Automated data lifecycle management using TTL (Time-To-Live) strategies.

## 3. Key Decisions & Rationale

- **Time-series vs Normal Collection**: Selected Time-series collections considering log analysis performance and storage compression rates.
- **Interface vs Class**: Promoted `WideEvent` from an interface that only defines types to a class capable of runtime validation. This reflects the perspective of treating logs as "data."
- **Connection Lifecycle**: Adopted a singleton approach where the connection is established during the application initialization phase and shared across adapters.

## 4. Retrospective: KPT

### Keep

- **Success of Adapter Pattern**: Zero modifications were required in the `LoggingService` code when switching from `FileLogger` to `MongoLogger`. This realized true Separation of Concerns (SoC).
- **Infrastructure Automation**: Automated environment setup by codifying indexes, TTL, and validation rules through `mongodb-init.js`.
- **Advanced Domain Model**: Improved code readability and safety by separating Enums and implementing class-based validation.

### Problem

- **Environment-Dependent Issues**: Encountered host name resolution issues (`ENOTFOUND atlas_local`) due to the Replica Set configuration in the local Docker environment. While temporarily resolved with `directConnection=true`, further consideration for cluster environments is needed.
- **Performance Trade-offs**: Potential CPU overhead is expected in ultra-high load environments as class instantiation and validation are performed for every log.

### Try

- **Preparation for Phase 3**: Establish vectorization and automated tagging strategies for RAG (Retrieval-Augmented Generation) based on logs accumulated in MongoDB.
- **Asynchronous Buffering**: Consider introducing in-memory buffering or MQ (Message Queue) to handle increased write loads.
- **Advanced Error Handling**: Consider a fallback strategy to file logging if the MongoDB connection fails.

---

**Result**: Confirmed stable data storage and indexing performance through load testing (2,000 entries), and established the data-driven foundation for moving forward to Phase 3.

## 5. Additional Insights

- **NestJS Built-in Logger vs. Custom Logging Module**:
  The built-in NestJS `Logger` was used to represent the **system's operational health**, such as application initialization and DB connection status. This is distinctly separated in concern from the custom `LoggingModule`, which records **user request events (Wide Events)** as data assets from a business perspective.
- **Extensibility**: While system logs are currently handled via standard output (stdout), if system status information also needs to be aggregated and analyzed, we can consider extending the `LoggerService` with a custom implementation to persist these logs to external storage (e.g., MongoDB).

# aahar
aahar is a high-throughput, low latency college/school canteen app built with performance and high concurrency handling in mind.

This project is still in development. Readme will be improved along the way.

## Architecture
aahar is a monorepo managed through Turborepo and Yarn workspaces. The tools used are:

- Envoy Gateway (TBD)
- ConnectRPC (HTTP/2) for inter service comms
- PostgreSQL via Kysely
- Dragonly for caching and ephemeral data
- RabbitMQ for order queues (TBD)
- Loki, Grafana, Tempo, Prometheus and OpenTelemetry, pino for Observability 

## Design
The monorepo is divided into packages (holds shared packages), services (the microservices), using turbo for management.

### packages
- logger: a pino logger instance instantiated by each service.
- proto: holds the proto defs for each service, along with protovalidate.
- tsconfig: tsconfig used by each service.
- tsdown: for transpiling to js.
- util: holds common utilities.

### services
- [auth](./services/auth/README.md): handles account creation (mobile number based) and user authentication (otp based).
- [catalog](./services/catalog/README.md): handles menu/items CRUD and caching.
- cart: handles order item management, coupons, pricing, etc. (TBD)
- orders: manages the orders themselves. (TBD)
- payments: payment providers management. (TBD)
- kitchen: real-time kitchen display system. (TBD)
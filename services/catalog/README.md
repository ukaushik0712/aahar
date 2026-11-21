# @aahar/catalog
This document contains all the design and architectural decisions made for the catalog service.

# Design

## Items

### 1. Item Modifier Groups:
Items support reusable customizations modeled as **Modifier Groups** and **Modifiers**. For example, a *Coffee* can attach:
- **Modifier Groups:** Defines a group of modifiers that the item supports. Has cardinality bounds (`min_selections`, `max_selections`) to allow how many modifiers a user can choose under this group. For example, for a group labelled "Choice of Milk", both min and max selections are 1, i.e only 1 choice can be selected.

- **Modifiers:** Individual options inside a group, each with an integer `price_delta` in paise (e.g., *Oat Milk* `+3000`, *Almond Milk* `+4000`) and an independent `is_available` flag.

Groups are decoupled from items and linked via a many-to-many bridge (`item_modifier_groups` with per-item `display_order`), allowing shared option sets to be attached across multiple items without duplicating data. Together, this forms a normalized **4-Tier Catalog Graph**:

```text
Category (e.g., Breakfast, Beverages)
   └── Item (e.g., Cold Brew, Masala Dosa)
         └── ModifierGroup (e.g., "Size", "Choice of Milk" — M:N via item_modifier_groups)
               └── Modifier (e.g., "Oat Milk", "Almond Milk", "Extra Shot")
```

### 2. Price Handling
To properly deal with decimal prices and to avoid floating-point rounding errors, all prices are represented in paise.

### 3. Supported Food types: 
Items can be of the following types: `VEG`, `NON_VEG`, `VEGAN`, `EGG`, `JAIN`.


## Postgres Tables

1. **`categories`**
   - `id`
   - `name`, `display_order`
   - `schedule_start`, `schedule_end` (Time slots: e.g., Breakfast active only 07:00–11:00)
   - `is_available`

2. **`items`**
   - `id`
   - `category_id` (FK)
   - `name`, `description`, `image_url`
   - `food_type` 
   - `base_price`
   - `is_available`
   - `packaging_fee`

3. **`modifier_groups`** (Defines selection rules)
   - `id`
   - `name`
   - `min_selections`
   - `max_selections`
   - `is_available`

4. **`item_modifier_groups`** (Many-to-Many bridge)
   - `item_id` (FK), `modifier_group_id` (FK)
   - `display_order`

5. **`modifiers`** (The concrete choices)
   - `id`
   - `modifier_group_id` (FK)
   - `name`
   - `price_delta`
   - `is_available`


## Caching
Catalog follows a Cache-Aside pattern. The database is never queried on routine student menu browsing. Rather, the data is fetched from Dragonfly (where it is stored in a binary format) with a default TTL of 24 hours. If the Dragonfly data has expired (or invalidated in the code by any of the RPCs which modify Items, Category or ItemModifierGroups data), a request to the database is made and cache is updated with this data.

Taking inspiration from Go's singleflight technique for concurrency, [cache.service.ts](./src/services/cache.service.ts) implements the same technique very simply. Imagine a scenario where at a specific time, a lot of students open the menu (i.e the Thundering Herd Problem scenario). On the very first request, if no cache key exists for the menu, a database request has to be made. This request is stored as a promise in a temporary variable. The second request onwards wait for this promise to resolve for the data. Once the promise resolves, i.e we have data from the database, the data is added to the cache and every subsequent request is served from the this cache.


## Layout

```text
services/catalog/
├── src/
│   ├── db/
│   │   ├── database.ts             # Kysely instance
│   │   ├── migrations/             # Database migrations
│   │   └── types.ts                # Database interfaces
│   ├── redis/
│   │   └── client.ts               # Dragonfly connection
│   ├── services/
│   │   ├── cache.service.ts        # Cache-aside
│   │   └── query.service.ts        # Kysely queries
│   ├── handlers/
│   │   └── catalog.ts              # ConnectRPC router implementation (CatalogService)
│   ├── interceptors/
│   │   ├── auth.gate.ts            # Authentication
│   │   └── errorLogger.ts          # Server error logger
│   ├── mappers/
│   │   └── catalog.mapper.ts       # Database row to Protobuf message mappers
│   ├── config.ts                   # Service specific constant values
│   ├── logger.ts                   # Pino logger instance
│   └── server.ts                   # HTTP/2 server
├── package.json
├── tsconfig.json
└── tsdown.config.ts
```
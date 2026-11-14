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

1. **`category`**
   - `id`
   - `name`, `display_order`
   - `schedule_start`, `schedule_end` (Time slots: e.g., Breakfast active only 07:00–11:00)
   - `is_available`

2. **`item`**
   - `id`
   - `category_id` (FK)
   - `name`, `description`, `image_url`
   - `food_type` 
   - `base_price`
   - `is_available`
   - `packaging_fee`

3. **`modifier_group`** (Defines selection rules)
   - `id`
   - `name`
   - `min_selections`
   - `max_selections`
   - `is_available`

4. **`item_modifier_group`** (Many-to-Many bridge)
   - `item_id` (FK), `modifier_group_id` (FK)
   - `display_order`

5. **`modifier`** (The concrete choices)
   - `id`
   - `modifier_group_id` (FK)
   - `name`
   - `price_delta`
   - `is_available`


## Enterprise Techniques for Catalog

### 1. Multi-Layer Caching (Cache-Aside Pattern)
Postgres is never queried on routine student menu browsing, rather:
- **Hot Key in Dragonfly:** `catalog:menu:active` stores the entire pre-compiled Protobuf menu hierarchy.
- **TTL + Invalidation:** High TTL (e.g., 24 hours), but whenever a Staff member mutates an item, price, or availability, `catalog:menu:active` is immediately invalidated.

### 2. Role-Based Access Control (RBAC) Contracts
- **Read RPCs (GetMenu, GetItem, etc):** Public or authenticated `STUDENT`.
- **Mutating RPCs (CreateCategory, CreateItem, etc):** Allowed to `STAFF` or `SUDO` only.

## Layout

```text
services/catalog/
├── src/
│   ├── db/
│   │   ├── database.ts             # Kysely instance
│   │   ├── migrations/             # Schema definitions
│   │   └── types.ts                # Database interface
│   ├── redis/
│   │   └── client.ts               # Dragonfly connection
│   ├── services/
│   │   ├── catalog.cache.ts        # Cache-aside & serialized menu snapshots
│   │   └── catalog.service.ts      # Domain logic (pricing math, graph validation)
│   ├── handlers/
│   │   └── catalog.ts              # ConnectRPC router (CatalogService)
│   ├── interceptors/
│   │   └── auth.gate.ts            # RBAC: Read = Public/Student; Write = Staff/Sudo
│   ├── config.ts
│   └── server.ts
├── package.json
└── tsconfig.json
```

(this is a high level abstraction and it is bound to change)
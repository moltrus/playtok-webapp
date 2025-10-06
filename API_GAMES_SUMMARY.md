# /api/games Endpoint - Quick Summary

## What Does This Endpoint Do?

The `/api/games` endpoint serves **game metadata** from a CSV file to the frontend application. Think of it as a **game catalog API** that provides information about all available mini-games in the PlayTok application.

---

## Simple Flow Diagram

```
┌─────────────────┐
│  Frontend App   │
│  (React)        │
└────────┬────────┘
         │
         │ HTTP GET /api/games?page=1&limit=20
         ▼
┌─────────────────────────────────────────────────┐
│  Express.js Server                              │
│  (server/routes/games.js)                       │
│                                                  │
│  1. Receives request                            │
│  2. Reads games.csv file                        │
│  3. Parses CSV → JSON                           │
│  4. Filters out excluded games                  │
│  5. Paginates results                           │
│  6. Returns JSON response                       │
└────────┬────────────────────────────────────────┘
         │
         │ JSON Response
         ▼
┌─────────────────┐
│  Frontend App   │
│  Displays games │
└─────────────────┘
```

---

## What Data Does It Provide?

### Input (CSV File)
**File**: `games.csv` (50 games)

**Sample CSV Row**:
```
ID,Name,Category,CoreMechanic,Controls,SessionLengthSec,OutcomeType,...
fruit_slice,Fruit Slice,Arcade,Swipe to slice falling fruits,Swipe,45,Survive,...
```

### Output (JSON Response)
```json
{
  "success": true,
  "count": 48,
  "pagination": { "total": 48, "currentPage": 1, "hasMore": true },
  "games": [
    {
      "id": "fruit-slice",
      "name": "Fruit Slice",
      "category": "Arcade",
      "mechanics": {
        "core": "Swipe to slice falling fruits",
        "controls": "Swipe",
        "sessionLength": 45,
        "outcome": {
          "type": "Survive",
          "condition": "3 misses end the run"
        }
      },
      "scoring": "+1 per slice; +3 combo",
      "notes": "Show slash trail; spawn rate ramps"
    }
  ]
}
```

---

## Two Endpoints Available

### 1. GET /api/games (List)
- **Purpose**: Get paginated list of all games
- **Parameters**: `?page=1&limit=20`
- **Use Case**: Display game catalog, infinite scroll
- **Example**: `GET /api/games?page=1&limit=20`

### 2. GET /api/games/:id (Detail)
- **Purpose**: Get single game by ID
- **Parameters**: `id` (path parameter)
- **Use Case**: Load specific game details
- **Example**: `GET /api/games/fruit-slice`

---

## Key Features

### 1. **CSV-Based Data Source**
- No database required
- Easy to edit (just update CSV)
- Reads file on every request (no caching)

### 2. **Automatic ID Normalization**
- Converts: `Fruit_Slice` → `fruit-slice`
- Supports both formats: `fruit_slice` and `fruit-slice`

### 3. **Pagination Support**
- Returns metadata: total count, pages, hasMore flag
- Default: 20 games per page
- Supports custom page size

### 4. **Automatic Filtering**
- Excludes: `tap-jump` and `tilt-maze`
- Only returns valid games (those with IDs)

### 5. **Error Handling**
- Handles missing CSV file
- Handles invalid game IDs
- Returns detailed errors in development mode

---

## Real-World Usage Example

```javascript
// Frontend code using the API

// Load first page of games for the game catalog
const response = await fetch('/api/games?page=1&limit=20');
const data = await response.json();

console.log(data.games.length);        // 20 games
console.log(data.pagination.hasMore);  // true (more pages available)

// Load a specific game when user clicks on it
const gameResponse = await fetch('/api/games/fruit-slice');
const gameData = await gameResponse.json();

console.log(gameData.game.name);       // "Fruit Slice"
console.log(gameData.game.mechanics);  // Full game mechanics object
```

---

## Why This Design?

### Advantages ✅
- **Simple**: No database setup required
- **Easy to maintain**: Just edit CSV file
- **Version controlled**: CSV file in git
- **Fast for small datasets**: 50 games load instantly

### Trade-offs ⚠️
- **No caching**: Re-reads file every request
- **In-memory pagination**: Loads all games even for 1 page
- **Not scalable**: For 1000+ games, consider database

---

## Files Involved

```
playtok-webapp/
├── games.csv                          # Source data (50 games)
├── server/
│   ├── index.js                       # Mounts /api/games route
│   ├── routes/
│   │   └── games.js                   # Endpoint implementation
│   └── utils/
│       └── parser.js                  # CSV parsing logic
└── src/
    └── services/
        └── gameService.js             # Frontend API client
```

---

## Quick Summary

**The `/api/games` endpoint is a simple REST API that:**

1. Reads game metadata from a CSV file
2. Transforms it into structured JSON
3. Provides two routes:
   - List endpoint (with pagination)
   - Detail endpoint (by ID)
4. Powers the game catalog in the frontend application

**Think of it as:** A bridge between the game metadata CSV file and the React frontend, making game information available through a clean REST API.

---

For complete technical details, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

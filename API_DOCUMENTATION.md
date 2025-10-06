# API Documentation: /api/games Endpoint

## Overview

The `/api/games` endpoint is a RESTful API that serves game data for the PlayTok web application. It reads game metadata from a CSV file (`games.csv`) and provides it to the frontend through two main routes.

## Endpoint Details

### Base URL
- **Development**: `http://localhost:5000/api`
- **Production**: `/api` (relative path)

---

## 1. GET /api/games

Retrieves a paginated list of all available games.

### Purpose
This endpoint reads the `games.csv` file, parses it into structured JSON objects, and returns a paginated list of games. It's used by the frontend to display the game catalog with support for infinite scrolling or pagination.

### Request

**Method:** `GET`

**URL:** `/api/games`

**Query Parameters:**
- `page` (optional, number, default: 1) - The page number to retrieve
- `limit` (optional, number, default: 20) - Number of games per page

**Example Requests:**
```
GET /api/games
GET /api/games?page=1&limit=20
GET /api/games?page=2&limit=10
```

### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "count": 48,
  "pagination": {
    "total": 48,
    "totalPages": 3,
    "currentPage": 1,
    "hasMore": true
  },
  "games": [
    {
      "id": "tap-jump",
      "name": "Tap to Jump",
      "category": "Runner",
      "mechanics": {
        "core": "Auto-run & tap-to-jump obstacles",
        "controls": "Tap (single)",
        "sessionLength": 30,
        "outcome": {
          "type": "Survive",
          "condition": "Survive 30s without colliding"
        }
      },
      "scoring": "+1 per second alive; bonus +10 for finishing 30s",
      "notes": "Mobile-first; ground at ~78% height; speed ramps"
    }
    // ... more games
  ]
}
```

**Error Responses:**

*404 Not Found - Games data file not found:*
```json
{
  "success": false,
  "message": "Games data file not found"
}
```

*500 Internal Server Error - Server error:*
```json
{
  "success": false,
  "message": "Server error while fetching games data",
  "error": "Error details (only in development mode)"
}
```

### Game Object Structure

Each game object in the response contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (lowercase, hyphen-separated) |
| `name` | string | Display name of the game |
| `category` | string | Game category (e.g., "Runner", "Arcade", "Puzzle") |
| `mechanics` | object | Game mechanics details |
| `mechanics.core` | string | Core gameplay mechanic |
| `mechanics.controls` | string | Control scheme |
| `mechanics.sessionLength` | number | Game session length in seconds |
| `mechanics.outcome.type` | string | Outcome type (e.g., "Survive", "Win") |
| `mechanics.outcome.condition` | string | Win/lose condition description |
| `scoring` | string | Scoring system description |
| `notes` | string | Additional implementation notes |

### Filtering

The endpoint automatically filters out two specific games:
- `tap-jump`
- `tilt-maze`

These games are excluded during the CSV parsing process.

---

## 2. GET /api/games/:id

Retrieves a single game by its ID.

### Purpose
Fetches detailed information about a specific game using its unique identifier. Used when the user selects or views a specific game.

### Request

**Method:** `GET`

**URL:** `/api/games/:id`

**Path Parameters:**
- `id` (required, string) - The game ID (supports both underscore and hyphen formats)

**Example Requests:**
```
GET /api/games/fruit-slice
GET /api/games/memory_flip
```

### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "game": {
    "id": "fruit-slice",
    "name": "Fruit Slice",
    "category": "Arcade",
    "mechanics": {
      "core": "Swipe to slice falling/arching fruits",
      "controls": "Swipe",
      "sessionLength": 45,
      "outcome": {
        "type": "Survive",
        "condition": "3 misses end the run or timer expires"
      }
    },
    "scoring": "+1 per slice; +3 combo (≥2 fruits in one swipe)",
    "notes": "Show simple slash trail; spawn rate ramps"
  }
}
```

**Error Responses:**

*404 Not Found - Game not found:*
```json
{
  "success": false,
  "message": "Game with ID fruit-ninja not found"
}
```

*404 Not Found - Games data file not found:*
```json
{
  "success": false,
  "message": "Games data file not found"
}
```

*500 Internal Server Error - Server error:*
```json
{
  "success": false,
  "message": "Server error while fetching game data",
  "error": "Error details (only in development mode)"
}
```

### ID Normalization

The endpoint handles both underscore and hyphen formats:
- Request with `fruit_slice` will find game with ID `fruit-slice`
- Request with `fruit-slice` will find game with ID `fruit-slice`
- Both underscores and hyphens are normalized to hyphens during lookup

---

## Data Source: games.csv

### CSV File Location
`/games.csv` (root of the project)

### CSV Format

The CSV file contains approximately 50 games with the following columns:

| Column | Description |
|--------|-------------|
| S. No | Sequential number |
| ID | Game identifier (gets normalized to lowercase with hyphens) |
| Name | Display name |
| Category | Game category |
| CoreMechanic | Core gameplay mechanic |
| Controls | Control scheme |
| SessionLengthSec | Session length in seconds |
| OutcomeType | Type of game outcome |
| OutcomeCondition | Win/lose condition |
| Scoring | Scoring rules |
| Notes | Implementation notes |

### CSV Parsing Process

1. **Read File**: The `games.csv` file is read from disk on every request
2. **Parse CSV**: Custom CSV parser handles comma-separated values with quote support
3. **Transform Data**: Each row is transformed into a structured game object:
   - ID is normalized: lowercase, spaces/underscores → hyphens
   - Numeric fields are parsed (e.g., SessionLengthSec → integer)
   - Nested objects are created (mechanics.outcome)
4. **Filter**: Games with IDs `tap-jump` and `tilt-maze` are excluded
5. **Paginate** (for list endpoint): Results are sliced based on page and limit

---

## Implementation Details

### Technology Stack
- **Framework**: Express.js
- **Language**: Node.js (ES modules)
- **Data Source**: CSV file
- **CORS**: Enabled for cross-origin requests

### File Structure

```
server/
├── index.js              # Main Express app, mounts /api/games route
├── routes/
│   └── games.js          # Games endpoint implementation
└── utils/
    └── parser.js         # CSV parsing utilities
```

### Key Implementation Points

1. **No Database**: Games are read directly from a CSV file on each request (no caching)
2. **Synchronous File Reading**: Uses `readFileSync` to read the CSV file
3. **In-Memory Pagination**: Entire dataset is loaded and then sliced in memory
4. **ID Normalization**: Both route handler and parser normalize game IDs for consistency
5. **Error Handling**: Comprehensive error handling with environment-aware error details

### Performance Considerations

- The CSV file is read on **every request** (no caching implemented)
- All games are loaded into memory even for paginated requests
- For the current dataset size (~50 games), this is acceptable
- For larger datasets, consider:
  - Implementing server-side caching
  - Using a database
  - Implementing streaming CSV parsing

---

## Usage in Frontend

### Client Service

The frontend uses a `gameService.js` module to interact with the API:

**Location**: `src/services/gameService.js`

**Functions**:
```javascript
// Fetch paginated games list
const games = await fetchGames(page, limit);

// Fetch single game by ID
const game = await fetchGameById('fruit-slice');
```

### Example Usage

```javascript
// Load first page of games
const response = await fetchGames(1, 20);
console.log(response.games);        // Array of 20 games
console.log(response.pagination);   // Pagination metadata

// Load next page
const response2 = await fetchGames(2, 20);

// Get specific game
const game = await fetchGameById('memory-flip');
console.log(game.game);  // Single game object
```

---

## Testing the API

### Using curl

```bash
# Get first page of games
curl http://localhost:5000/api/games

# Get second page with 10 games per page
curl http://localhost:5000/api/games?page=2&limit=10

# Get specific game
curl http://localhost:5000/api/games/fruit-slice
```

### Using Browser

Navigate to:
- http://localhost:5000/api/games
- http://localhost:5000/api/games/fruit-slice

---

## Summary

The `/api/games` endpoint serves as the **primary data source for game metadata** in the PlayTok application. It:

1. **Reads** game data from a CSV file
2. **Parses** and transforms it into structured JSON
3. **Provides** two routes:
   - List endpoint with pagination support
   - Detail endpoint for individual games
4. **Filters** out specific games (tap-jump, tilt-maze)
5. **Normalizes** game IDs for consistent lookup
6. **Handles** errors gracefully with environment-aware responses

This endpoint is essential for the game catalog, game selection, and game loading functionality in the PlayTok web application.

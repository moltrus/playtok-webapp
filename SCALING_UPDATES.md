# PlayTok Webapp Scalability Update

This update adds scalability to handle hundreds of games efficiently by implementing the following optimizations:

## Key Components

### 1. Game Registry System (`gameRegistry.js`)
- Dynamically registers games without requiring manual imports for each new game
- Uses naming conventions and dynamic imports to automatically handle new games
- Provides efficient caching and loading of game classes

### 2. Virtualized Game Feed (`VirtualizedGameFeed.js`)
- Only renders visible game cards in the viewport
- Uses windowing technique to efficiently handle long lists of games
- Automatically loads more games as the user scrolls

### 3. Enhanced Game Context (`GameContext.new.js`)
- Supports pagination and efficient management of large game collections
- Optimized auto-growth to only update a subset of games at a time
- Provides a game details cache to reduce API calls

### 4. Dynamic Game Loader (`DynamicGameLoader.js`)
- Handles loading of game code on demand with proper loading indicators
- Shows progress during game loading for better user experience
- Handles error states gracefully

## Implementation Instructions

Follow these steps to implement the scalability updates:

1. Replace the existing Game Preloader with the new version:
   ```bash
   copy /Y src\utils\gamePreloader.new.js src\utils\gamePreloader.js
   ```

2. Copy the new Game Registry file into place:
   ```bash
   copy src\utils\gameRegistry.js src\utils\gameRegistry.js
   ```

3. Replace the Game Context with the optimized version:
   ```bash
   copy /Y src\context\GameContext.new.js src\context\GameContext.js
   ```

4. Update HomePage.js to use the VirtualizedGameFeed:
   - Import the new component: `import VirtualizedGameFeed from '../components/VirtualizedGameFeed';`
   - Replace `<GameFeed onEnterGame={handleEnterGame} />` with `<VirtualizedGameFeed onEnterGame={handleEnterGame} />`

5. Update GamePage.js to use the DynamicGameLoader:
   - Import the component: `import DynamicGameLoader from '../components/DynamicGameLoader';`
   - Use it to load games dynamically

6. Update server-side endpoints (if needed):
   - Ensure the backend supports pagination for game listing
   - Add support for fetching individual game details by ID

## Naming Convention for New Games

When adding new games, follow this naming convention:

1. Game ID should be in kebab-case (e.g., `new-cool-game`)
2. Game class file should be in PascalCase (e.g., `NewCoolGameGame.js`)
3. Export a class named with the PascalCase name + "Game" suffix (e.g., `NewCoolGameGame`)

Example:
```javascript
// File: src/games/NewCoolGameGame.js
import BaseGame from './BaseGame';

export class NewCoolGameGame extends BaseGame {
  // Game implementation
}
```

With this convention, the registry will automatically handle loading the game without any manual updates to import statements or switch cases.

## Performance Considerations

- The virtualization technique ensures only visible games are rendered, which is critical for performance with large lists
- Game code is loaded on demand, reducing initial load time
- Popular games are preloaded in the background for better user experience
- Auto-growth is optimized to only update a small subset of games at a time

These optimizations ensure the app can handle hundreds of games without performance degradation.
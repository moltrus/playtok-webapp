# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

---

## PlayTok Swipe Feed MVP

This project includes an experimental mobile-focused swipe-to-play feed of 25 mini-games (placeholder entries).

### Core Loop
1. Vertically swipe (TikTok style) through full-screen cards.
2. Each card shows a tinted scaled (75%) preview, stats, and buttons.
3. Tap `Play Now` (if you have enough coins) to enter the game view.
4. Simulate a Win/Lose result (placeholder) to return and update coins/stats.

### Coin Economy
* Each game costs a number of coins to enter (`costCoins`) and awards `rewardCoins` on a win.
* Starting balance: 100 coins.
* Simple IAP stub buttons (+100 / +250 / +600) add coins instantly (client only).
* If you lack coins the play button is disabled.

### Fake Organic Stats (MVP)
Per-game stats tracked & displayed:
* Likes (👍)
* Plays (▶️)
* Current players (🧑)
* Winners (🏆)
* Coins spent (🪙)

An interval every 8s randomly increments likes, plays, and winners to simulate growth. Data persists to `localStorage` under key `playtok_v1_state`.

### File Overview
* `src/data/games.js` – 25 game metadata objects (id, name, costs, rewards, preview placeholder name)
* `src/context/GameContext.js` – coins, stats state, auto-growth, persistence, handlers
* `src/components/GameFeed.js` – scroll-snap vertical feed container
* `src/components/GameCard.js` – individual game card UI
* `src/components/GamePlayer.js` – placeholder in-game view with Win/Lose simulation
* `src/components/CoinBar.js` – top fixed coin balance + purchase stub buttons

### Scroll Experience
Implemented with native CSS `scroll-snap-type: y mandatory` to provide page-like snapping on mobile. Each card occupies full viewport height minus overlay bars.

### Adding a New Game Entry
1. Open `src/data/games.js`.
2. Append a new object: `{ id: 'unique-id', name: 'Title', costCoins: X, rewardCoins: Y, preview: 'asset.png' }`.
3. (Optional) Provide a real preview asset in `public/` later or integrate a dynamic canvas capture system.
4. Implement actual gameplay integration inside `GamePlayer` based on the selected `gameId` (switch/case or dynamic import).

### Dynamic Games from stats.json
The app attempts to fetch `/data/stats.json` (copied from the core Playtok project) and transforms each entry into a game config:
* `costCoins` heuristic: `min(10, 5 + floor(timePlayed / 25))`
* `rewardCoins`: `cost * 2 + (likes % 3)`
If fetch fails, it falls back to the static list in `src/data/games.js`.
To update: replace `public/data/stats.json` with a newer export and reload.

### Production Considerations (Future)
* Replace placeholder preview with video/gif or real mini-game canvas snapshot.
* Move stat & coin logic to backend with auth and secure IAP.
* Add real ad network SDK integration (rewarded + interstitial).
* Implement real mini-games or load from an iframe/micro-app registry.
* A/B test coin rewards and costs.
* Add haptic feedback and gesture velocity-based snap improvements.

### Legacy Game Logic Integration
`GamePlayer` now attempts to load legacy games through a loader in `src/legacy/legacyGameLoader.js` using the feed's `gameId`.
Currently this returns a simulated game loop placeholder. To wire real logic:
1. Port the `BaseGame` class (from original `Playtok/js/gameManager.js`) into a shared module inside `src/legacy/`.
2. Copy each legacy game class (e.g., `quickTap.js`) and export it as ES module.
3. In `legacyGameLoader.js`, replace `createSimulatedLegacyGame` with dynamic `import()` mapping to those modules, instantiate the right class, assign an `onGameEnd` callback, then call `start()`.
4. Ensure assets/sprites required by PixiJS (if used) are available or provide fallbacks.
5. Provide a win condition -> call `onEnd(score)`; user chooses “Claim Win” to award coins.

This staged approach lets the feed + economy ship ahead of full legacy refactor.

### Resetting Local Data
Open DevTools > Application > Local Storage and remove `playtok_v1_state` then refresh.

---

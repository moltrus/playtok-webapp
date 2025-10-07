import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { GameProvider } from './context/GameContext';
import CoinBar from './components/CoinBar';

const HomePage = React.lazy(() => import('./pages/HomePage'));
const GamePage = React.lazy(() => import('./pages/GamePage'));

function AppShell() {
  return (
    <div className="app-root">
      <CoinBar />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Router>
        <AppShell />
      </Router>
    </GameProvider>
  );
}

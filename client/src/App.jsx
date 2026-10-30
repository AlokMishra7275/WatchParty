import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { RoomProvider } from './context/RoomContext';
import { LandingPage } from './pages/LandingPage';
import { WatchRoom } from './pages/WatchRoom';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <RoomProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/room/:roomId" element={<WatchRoom />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RoomProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

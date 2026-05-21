/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { HomeFeed } from './pages/HomeFeed';
import { ExplorePage } from './pages/ExplorePage';
import { CreatePostPage } from './pages/CreatePostPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReadLaterPage } from './pages/ReadLaterPage';
import { AnimatedLoader } from './components/AnimatedLoader';

function AppRoutes() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return <AnimatedLoader fullScreen={true} />;
  }

  return (
    <Router>
      <div className={`${theme === 'dark' ? 'bg-[#08080a] text-white' : 'bg-[#f8f5f2] text-[#1a1a1a]'} min-h-screen relative overflow-hidden transition-colors duration-500`}>
        {/* Grain Texture Overlay */}
        <div className="grain pointer-events-none opacity-[0.03] dark:opacity-[0.05]" />

        {/* Background Atmosphere */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className={`absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full ${theme === 'dark' ? 'opacity-10' : 'opacity-[0.03]'} blur-[120px]`} style={{ background: 'radial-gradient(circle, #6B21A8 0%, transparent 70%)' }}></div>
          <div className={`absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full ${theme === 'dark' ? 'opacity-5' : 'opacity-[0.02]'} blur-[150px]`} style={{ background: 'radial-gradient(circle, #4C1D95 0%, transparent 70%)' }}></div>
        </div>

        <div className="relative z-10 min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={user ? <HomeFeed /> : <LandingPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/create" element={user ? <CreatePostPage /> : <Navigate to="/" />} />
              <Route path="/edit/:postId" element={user ? <CreatePostPage /> : <Navigate to="/" />} />
              <Route path="/read-later" element={<ReadLaterPage />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}


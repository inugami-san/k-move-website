import React, { useState, useEffect } from 'react';
import './App.css';
import Home from './components/Home';
import Beatmaps from './components/Beatmaps';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';
import Demo from './components/Demo';
import { supabase } from './supabaseClient';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Retro Scanline CRT screen overlay */}
      <div className="scanline"></div>

      {/* Glassmorphism Sticky Header Navigation */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--glass-bg)',
        borderBottom: '1px solid var(--glass-border)',
        backdropFilter: 'var(--glass-blur)',
        padding: '1.25rem 0',
        transition: 'background 0.3s'
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}>
          {/* Logo Brand */}
          <div 
            onClick={() => setActiveTab('home')}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              userSelect: 'none'
            }}
          >
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--color-left)',
              boxShadow: 'var(--shadow-left)',
              display: 'inline-block'
            }}></span>
            <h1 style={{
              fontSize: '1.6rem',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              margin: 0,
              textTransform: 'uppercase'
            }}>
              K <span className="text-gradient-dual" style={{ fontWeight: 900 }}>MOVE</span>
            </h1>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--color-right)',
              boxShadow: 'var(--shadow-right)',
              display: 'inline-block'
            }}></span>
          </div>

          {/* Navigation Links */}
          <nav style={{
            display: 'flex',
            gap: '2.5rem',
            alignItems: 'center'
          }}>
            {['home', 'demo', 'beatmaps', 'leaderboard', 'profile'].map((tab) => (
              <span 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`nav-link ${activeTab === tab ? 'active' : ''}`}
                style={{
                  fontSize: '0.95rem',
                  textTransform: 'capitalize',
                  padding: '0.25rem 0',
                  position: 'relative'
                }}
              >
                {tab === 'demo' ? 'Web Play' : tab}
              </span>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Router */}
      <main className="container" style={{
        flex: 1,
        padding: '4rem 2rem 6rem',
        position: 'relative'
      }}>
        {/* Render Tab components with transition keys */}
        <div key={activeTab} style={{
          animation: 'fadeSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          {activeTab === 'home' && <Home setActiveTab={setActiveTab} />}
          {activeTab === 'demo' && <Demo session={session} userProfile={userProfile} fetchUserProfile={fetchUserProfile} />}
          {activeTab === 'beatmaps' && <Beatmaps />}
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'profile' && <Profile session={session} userProfile={userProfile} setUserProfile={setUserProfile} fetchUserProfile={fetchUserProfile} />}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: 'rgba(5, 6, 10, 0.95)',
        borderTop: '1px solid var(--glass-border)',
        padding: '3rem 0',
        color: 'var(--color-text-muted)',
        fontSize: '0.9rem',
        textAlign: 'center',
        backdropFilter: 'var(--glass-blur)'
      }}>
        <div className="container">
          <p style={{ marginBottom: '1rem', fontWeight: 300 }}>
            © {new Date().getFullYear()} K Move. Designed for physical coordinate tracking and synth rhythm sync.
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            fontSize: '0.85rem'
          }}>
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); alert("Open Xcode project: K Move.xcodeproj to inspect game engine build settings."); }}>App Source</a>
            <span>•</span>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="nav-link">GitHub</a>
            <span>•</span>
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); alert("Privacy Policy: K Move camera processing is performed entirely local to your device and no video stream is ever stored or transmitted."); }}>Privacy & Camera Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

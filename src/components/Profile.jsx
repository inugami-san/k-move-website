import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Profile({ session, userProfile, setUserProfile, fetchUserProfile }) {
  // Guest profile state (localStorage fallback)
  const [guestUsername, setGuestUsername] = useState(() => {
    return localStorage.getItem('kmove_guest_username') || 'Guest_Challenger';
  });
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState('');

  // Auth form states
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Score history state for chart
  const [scoreHistory, setScoreHistory] = useState([]);

  useEffect(() => {
    if (session) {
      fetchScoreHistory();
    }
  }, [session]);

  const fetchScoreHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('profile_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(7);
      
      if (!error && data) {
        setScoreHistory(data);
      }
    } catch (err) {
      console.error('Error fetching score history:', err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    try {
      if (authMode === 'signup') {
        if (!authUsername.trim()) {
          setAuthError('Username is required');
          setAuthLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              username: authUsername.trim()
            }
          }
        });

        if (error) {
          setAuthError(error.message);
        } else {
          // Check if profile was auto-created or if we need to do it manually
          const user = data.user;
          if (user) {
            // Upsert profile to be safe
            const { error: pError } = await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                username: authUsername.trim(),
                country: 'US',
                grade: 'A'
              });
            
            if (pError) {
              console.error('Profile creation error:', pError);
            }
          }
          setAuthSuccess('Account created successfully! You are now logged in.');
          setAuthEmail('');
          setAuthPassword('');
          setAuthUsername('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });

        if (error) {
          setAuthError(error.message);
        } else {
          setAuthSuccess('Logged in successfully!');
          setAuthEmail('');
          setAuthPassword('');
        }
      }
    } catch (err) {
      setAuthError(err.message || 'An unexpected error occurred.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
    }
  };

  const handleSaveUsername = async () => {
    const cleanName = tempName.trim();
    if (!cleanName) return;

    if (session) {
      const { error } = await supabase
        .from('profiles')
        .update({ username: cleanName })
        .eq('id', session.user.id);
      
      if (error) {
        alert(error.message);
      } else {
        fetchUserProfile(session.user.id);
        setIsEditing(false);
      }
    } else {
      setGuestUsername(cleanName);
      localStorage.setItem('kmove_guest_username', cleanName);
      setIsEditing(false);
    }
  };

  // SVG Chart Setup
  const chartWidth = 500;
  const chartHeight = 160;
  const padding = 30;

  const isRankChart = !session || scoreHistory.length === 0;
  const chartData = isRankChart 
    ? [
        { label: 'Mon', value: 1240 },
        { label: 'Tue', value: 1150 },
        { label: 'Wed', value: 980 },
        { label: 'Thu', value: 840 },
        { label: 'Fri', value: 690 },
        { label: 'Sat', value: 540 },
        { label: 'Sun', value: 412 },
      ]
    : scoreHistory.map((s, idx) => ({
        label: s.song_title.split(' ')[0] || `Play ${idx+1}`,
        value: s.pp
      }));

  const maxVal = Math.max(...chartData.map(d => d.value), 1500);
  const minVal = Math.min(...chartData.map(d => d.value), 100);

  const getX = (index) => padding + (index * (chartWidth - padding * 2)) / Math.max(chartData.length - 1, 1);
  const getY = (val) => {
    if (maxVal === minVal) return chartHeight / 2;
    const ratio = (val - minVal) / (maxVal - minVal);
    // Rank: smaller is better (worse/higher numbers at bottom)
    // PP: higher is better (larger/higher numbers at top)
    return isRankChart 
      ? padding + ratio * (chartHeight - padding * 2) 
      : chartHeight - padding - ratio * (chartHeight - padding * 2);
  };

  const getBezierPath = () => {
    if (chartData.length === 0) return '';
    if (chartData.length === 1) return `M ${getX(0)} ${getY(chartData[0].value)} L ${getX(0)} ${getY(chartData[0].value)}`;
    let d = `M ${getX(0)} ${getY(chartData[0].value)}`;
    
    for (let i = 0; i < chartData.length - 1; i++) {
      const x1 = getX(i);
      const y1 = getY(chartData[i].value);
      const x2 = getX(i + 1);
      const y2 = getY(chartData[i + 1].value);
      
      const cpX1 = x1 + (x2 - x1) / 2;
      const cpY1 = y1;
      const cpX2 = x1 + (x2 - x1) / 2;
      const cpY2 = y2;
      
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x2} ${y2}`;
    }
    return d;
  };

  const linePath = getBezierPath();
  const areaPath = linePath ? `${linePath} L ${getX(chartData.length - 1)} ${chartHeight - padding} L ${getX(0)} ${chartHeight - padding} Z` : '';

  // Get active profile properties
  const activeUsername = session && userProfile ? userProfile.username : guestUsername;
  const playCount = session && userProfile ? userProfile.play_count : 0;
  const avgAccuracy = session && userProfile ? userProfile.avg_accuracy : 0.0;
  const pp = session && userProfile ? userProfile.pp : 0;
  const grade = session && userProfile ? userProfile.grade : 'A';

  const perfects = session && userProfile ? userProfile.perfect_count : 0;
  const goods = session && userProfile ? userProfile.good_count : 0;
  const nices = session && userProfile ? userProfile.nice_count : 0;
  const okays = session && userProfile ? userProfile.okay_count : 0;
  const misses = session && userProfile ? userProfile.miss_count : 0;
  const totalHits = perfects + goods + nices + okays + misses;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem' }}>
      
      {/* Top Banner Profile Summary */}
      <div className="panel panel-left-glow" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '2rem',
        background: 'linear-gradient(135deg, rgba(10, 12, 22, 0.8) 0%, rgba(107, 173, 214, 0.02) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
          {/* Avatar Icon */}
          <div style={{
            width: '84px',
            height: '84px',
            borderRadius: '22px',
            background: 'linear-gradient(135deg, var(--color-left) 0%, var(--color-accent) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-left)',
            border: '2.5px solid #fff'
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#03060f" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          
          <div>
            {isEditing ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  maxLength={18}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--color-left)',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    color: 'var(--color-text)',
                    fontFamily: 'inherit',
                    fontWeight: 700,
                    outline: 'none',
                    fontSize: '1rem'
                  }}
                />
                <button onClick={handleSaveUsername} className="btn btn-cyan" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', borderRadius: '8px' }}>Save</button>
                <button onClick={() => setIsEditing(false)} className="btn btn-outline" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', borderRadius: '8px' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{activeUsername}</h2>
                <button 
                  onClick={() => { setTempName(activeUsername); setIsEditing(true); }}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--glass-border)',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    borderRadius: '6px',
                    padding: '0.3rem',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
              </div>
            )}
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 300 }}>
              {session ? `Authenticated Fighter (${grade} Grade)` : 'Guest Mode (Not Synced)'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center', background: 'rgba(18, 22, 38, 0.35)', padding: '0.8rem 1.4rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-left)', letterSpacing: '-0.01em' }}>{avgAccuracy.toFixed(1)}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Accuracy</div>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(18, 22, 38, 0.35)', padding: '0.8rem 1.4rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-right)', letterSpacing: '-0.01em' }}>{playCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Play Count</div>
          </div>
          {session && (
            <div style={{ textAlign: 'center', background: 'rgba(18, 22, 38, 0.35)', padding: '0.8rem 1.4rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent)', letterSpacing: '-0.01em' }}>{pp}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pose Points (PP)</div>
            </div>
          )}
        </div>
      </div>

      {/* Main Area: Split into statistics and Auth Portal */}
      <div className="grid-2">
        
        {/* Play Stats / Hit Accuracy Breakdown */}
        <div className="panel">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>Hit Accuracy Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {[
              { label: 'Perfect', count: session ? perfects : 1245, color: 'var(--color-left)' },
              { label: 'Good', count: session ? goods : 485, color: '#00e676' },
              { label: 'Nice', count: session ? nices : 210, color: '#ffeb3b' },
              { label: 'Okay', count: session ? okays : 88, color: 'var(--color-right)' },
              { label: 'Miss', count: session ? misses : 42, color: '#ff1744' },
            ].map((stat) => {
              const divisor = session ? (totalHits || 1) : 2070;
              const percentage = (stat.count / divisor) * 100;
              return (
                <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ width: '80px', fontWeight: 700, fontSize: '0.9rem', color: stat.color }}>{stat.label}</span>
                  <div style={{ flex: 1, height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: stat.color,
                      borderRadius: '4px',
                      boxShadow: `0 0 8px ${stat.color}`
                    }}></div>
                  </div>
                  <span style={{ width: '50px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{stat.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sync Portal / Database Auth Panel */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {session ? (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Cloud Sync Active</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem', maxWidth: '340px', marginInline: 'auto', lineHeight: '1.5' }}>
                Your scores and physical calibration profiles are securely backed up in your Supabase database.
              </p>
              <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.6rem 2rem', borderRadius: '8px' }}>
                Sign Out
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
                <button 
                  onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: authMode === 'login' ? '2.5px solid var(--color-left)' : 'none',
                    color: authMode === 'login' ? 'var(--color-left)' : 'var(--color-text-muted)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: authMode === 'signup' ? '2.5px solid var(--color-left)' : 'none',
                    color: authMode === 'signup' ? 'var(--color-left)' : 'var(--color-text-muted)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {authMode === 'signup' && (
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>Username</label>
                    <input 
                      type="text" 
                      placeholder="PoseKing" 
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        padding: '0.6rem 0.8rem',
                        color: '#fff',
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>Email Address</label>
                  <input 
                    type="email" 
                    placeholder="you@example.com" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      color: '#fff',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{
                      width: '100%',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      color: '#fff',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>

                {authError && (
                  <div style={{ color: '#ff1744', fontSize: '0.8rem', fontWeight: 600 }}>
                    ❌ {authError}
                  </div>
                )}
                {authSuccess && (
                  <div style={{ color: '#00e676', fontSize: '0.8rem', fontWeight: 600 }}>
                    ✅ {authSuccess}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="btn btn-cyan"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}
                >
                  {authLoading ? 'Connecting...' : authMode === 'signup' ? 'Sign Up' : 'Sign In'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* SVG Bezier Curve Area Chart for score history */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>
            {isRankChart ? 'Rank Progress' : 'Pose Points (PP) Progress'}
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', fontWeight: 300 }}>
            {isRankChart 
              ? 'Mock weekly rank progression (smaller numbers represent better performance).'
              : 'Your real-time Pose Points progress across your last 7 played games (higher is better).'}
          </p>
        </div>
        
        <div style={{ width: '100%', overflow: 'hidden' }}>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight}>
            <defs>
              <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-left)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--color-left)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1={padding} y1={getY(maxVal)} x2={chartWidth - padding} y2={getY(maxVal)} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3"/>
            <line x1={padding} y1={getY((maxVal + minVal) / 2)} x2={chartWidth - padding} y2={getY((maxVal + minVal) / 2)} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3"/>
            <line x1={padding} y1={getY(minVal)} x2={chartWidth - padding} y2={getY(minVal)} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3"/>

            {/* Shaded Area underneath */}
            {areaPath && (
              <path d={areaPath} fill="url(#chartAreaGrad)" />
            )}

            {/* Connected Bezier Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="var(--color-left)"
                strokeWidth="3.5"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(var(--shadow-left))' }}
              />
            )}

            {/* Line Nodes */}
            {chartData.map((d, i) => (
              <g key={i}>
                <circle
                  cx={getX(i)}
                  cy={getY(d.value)}
                  r="4.5"
                  fill="#040508"
                  stroke="var(--color-left)"
                  strokeWidth="3"
                />
                <text 
                  x={getX(i)} 
                  y={chartHeight - 6} 
                  fill="var(--color-text-muted)" 
                  fontSize="10" 
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {d.label}
                </text>
                <text 
                  x={getX(i)} 
                  y={getY(d.value) - 12} 
                  fill="var(--color-text)" 
                  fontSize="9.5" 
                  fontWeight="800"
                  textAnchor="middle"
                >
                  {isRankChart ? `#${d.value}` : `${d.value}pp`}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Badges / Accomplishments */}
      <div className="panel">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>Achievements & Badges</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1.5rem'
        }}>
          {[
            { title: 'Calibration Master', desc: 'Successfully calibrated pose-tracking camera.', unlocked: true, icon: '📹' },
            { title: 'Perfect Flow', desc: 'Achieve a total hit count of 50+ on any track.', unlocked: session ? totalHits >= 50 : true, icon: '🔥' },
            { title: 'Beat Creator', desc: 'Create a custom map using the beat editor.', unlocked: false, icon: '🎹' },
            { title: 'Pose Master', desc: 'Unlocks by achieving more than 1000 Pose Points (PP).', unlocked: session ? pp >= 1000 : true, icon: '👑' },
          ].map((badge) => (
            <div 
              key={badge.title} 
              style={{
                background: 'rgba(18, 22, 38, 0.2)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                padding: '1.5rem 1.25rem',
                opacity: badge.unlocked ? 1 : 0.35,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1.1rem',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => { if (badge.unlocked) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
            >
              <div style={{ fontSize: '2.25rem' }}>{badge.icon}</div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: badge.unlocked ? 'var(--color-text)' : 'var(--color-text-muted)', letterSpacing: '-0.01em' }}>{badge.title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', lineHeight: '1.4', fontWeight: 300 }}>{badge.desc}</p>
                <span style={{
                  display: 'inline-block',
                  marginTop: '0.6rem',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  color: badge.unlocked ? 'var(--color-left)' : 'var(--color-text-muted)'
                }}>
                  {badge.unlocked ? 'UNLOCKED' : 'LOCKED'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

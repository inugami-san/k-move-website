import React, { useState } from 'react';

const mockRankHistory = [
  { day: 'Mon', rank: 1240 },
  { day: 'Tue', rank: 1150 },
  { day: 'Wed', rank: 980 },
  { day: 'Thu', rank: 840 },
  { day: 'Fri', rank: 690 },
  { day: 'Sat', rank: 540 },
  { day: 'Sun', rank: 412 },
];

export default function Profile() {
  const [username, setUsername] = useState('Guest_Challenger');
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(username);

  // SVG Chart Dimensions
  const chartWidth = 500;
  const chartHeight = 160;
  const padding = 30;

  const maxRank = 1500;
  const minRank = 100;
  
  const getX = (index) => padding + (index * (chartWidth - padding * 2)) / (mockRankHistory.length - 1);
  const getY = (rank) => {
    const ratio = (rank - minRank) / (maxRank - minRank);
    return chartHeight - padding - ratio * (chartHeight - padding * 2);
  };

  // Generate cubic bezier curve path for smooth aesthetic chart lines (Wow factor!)
  const getBezierPath = () => {
    if (mockRankHistory.length === 0) return '';
    let d = `M ${getX(0)} ${getY(mockRankHistory[0].rank)}`;
    
    for (let i = 0; i < mockRankHistory.length - 1; i++) {
      const x1 = getX(i);
      const y1 = getY(mockRankHistory[i].rank);
      const x2 = getX(i + 1);
      const y2 = getY(mockRankHistory[i + 1].rank);
      
      // Control points
      const cpX1 = x1 + (x2 - x1) / 2;
      const cpY1 = y1;
      const cpX2 = x1 + (x2 - x1) / 2;
      const cpY2 = y2;
      
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x2} ${y2}`;
    }
    return d;
  };

  const linePath = getBezierPath();
  // Construct closed path for area fill
  const areaPath = linePath ? `${linePath} L ${getX(mockRankHistory.length - 1)} ${chartHeight - padding} L ${getX(0)} ${chartHeight - padding} Z` : '';

  const handleSave = () => {
    if (tempName.trim()) {
      setUsername(tempName);
      setIsEditing(false);
    }
  };

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
                <button onClick={handleSave} className="btn btn-cyan" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', borderRadius: '8px' }}>Save</button>
                <button onClick={() => setIsEditing(false)} className="btn btn-outline" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', borderRadius: '8px' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{username}</h2>
                <button 
                  onClick={() => { setTempName(username); setIsEditing(true); }}
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
              Level 12 Rhythm Trainee (Rank #412)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center', background: 'rgba(18, 22, 38, 0.35)', padding: '0.8rem 1.4rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-left)', letterSpacing: '-0.01em' }}>94.8%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Accuracy</div>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(18, 22, 38, 0.35)', padding: '0.8rem 1.4rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-right)', letterSpacing: '-0.01em' }}>64</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Play Count</div>
          </div>
        </div>
      </div>

      {/* Grid of Stats and Rank History */}
      <div className="grid-2">
        
        {/* Play Stats Breakdown */}
        <div className="panel">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>Hit Accuracy Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {[
              { label: 'Perfect', count: 1245, color: 'var(--color-left)' },
              { label: 'Good', count: 485, color: '#00e676' },
              { label: 'Nice', count: 210, color: '#ffeb3b' },
              { label: 'Okay', count: 88, color: 'var(--color-right)' },
              { label: 'Miss', count: 42, color: '#ff1744' },
            ].map((stat) => (
              <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ width: '80px', fontWeight: 700, fontSize: '0.9rem', color: stat.color }}>{stat.label}</span>
                {/* Visual Progress bar */}
                <div style={{ flex: 1, height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(stat.count / 2070) * 100}%`,
                    height: '100%',
                    background: stat.color,
                    borderRadius: '4px',
                    boxShadow: `0 0 8px ${stat.color}`
                  }}></div>
                </div>
                <span style={{ width: '50px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{stat.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SVG Bezier Curve Area Chart */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>Rank Progress</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', fontWeight: 300 }}>Visual rank improvements over time (smaller is better).</p>
          </div>
          
          <div style={{ width: '100%', overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight}>
              <defs>
                {/* Gradient for area fill under bezier line */}
                <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-left)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-left)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={padding} y1={getY(1500)} x2={chartWidth - padding} y2={getY(1500)} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3"/>
              <line x1={padding} y1={getY(800)} x2={chartWidth - padding} y2={getY(800)} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3"/>
              <line x1={padding} y1={getY(100)} x2={chartWidth - padding} y2={getY(100)} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3"/>

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
              {mockRankHistory.map((d, i) => (
                <g key={i}>
                  <circle
                    cx={getX(i)}
                    cy={getY(d.rank)}
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
                    {d.day}
                  </text>
                  <text 
                    x={getX(i)} 
                    y={getY(d.rank) - 12} 
                    fill="var(--color-text)" 
                    fontSize="9.5" 
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    #{d.rank}
                  </text>
                </g>
              ))}
            </svg>
          </div>
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
            { title: 'Perfect Flow', desc: 'Achieve a combo of 100+ on any track.', unlocked: true, icon: '🔥' },
            { title: 'Beat Creator', desc: 'Create a custom map using the beat editor.', unlocked: false, icon: '🎹' },
            { title: 'Pose Master', desc: 'Reach top 500 on the global leaderboard.', unlocked: true, icon: '👑' },
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

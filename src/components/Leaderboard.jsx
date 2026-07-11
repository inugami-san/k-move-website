import React, { useState } from 'react';

const mockRankings = [
  { rank: 1, name: 'PoseKing99', accuracy: 99.65, maxCombo: 542, playCount: 840, pp: 9820, country: 'JP', grade: 'SS' },
  { rank: 2, name: 'rhythm_cat', accuracy: 98.92, maxCombo: 489, playCount: 650, pp: 9140, country: 'US', grade: 'S' },
  { rank: 3, name: 'Antigravity_Fan', accuracy: 98.45, maxCombo: 512, playCount: 710, pp: 8905, country: 'CA', grade: 'S' },
  { rank: 4, name: 'KMove_Pro', accuracy: 97.80, maxCombo: 420, playCount: 430, pp: 7990, country: 'KR', grade: 'S' },
  { rank: 5, name: 'NeonDancer', accuracy: 96.15, maxCombo: 395, playCount: 500, pp: 7320, country: 'DE', grade: 'A' },
  { rank: 6, name: 'swift_cather', accuracy: 95.80, maxCombo: 340, playCount: 290, pp: 6450, country: 'PH', grade: 'A' },
  { rank: 7, name: 'BodyCalibration', accuracy: 94.20, maxCombo: 310, playCount: 180, pp: 5800, country: 'GB', grade: 'A' },
];

export default function Leaderboard() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredRankings = mockRankings.filter(player => 
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const champion = mockRankings[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Banner Card for Weekly Champ */}
      <div className="panel panel-accent-glow" style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr',
        alignItems: 'center',
        padding: '2.5rem',
        background: 'linear-gradient(135deg, rgba(15, 17, 26, 0.9) 0%, rgba(213, 0, 249, 0.05) 100%)'
      }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-accent)', fontWeight: 'bold', letterSpacing: '0.1em' }}>
            WEEKLY MVP CHAMPION
          </span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0 1rem' }}>
            {champion.name}
          </h2>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Pose Points</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-left)' }}>{champion.pp} pp</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Avg Accuracy</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{champion.accuracy}%</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Max Combo</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{champion.maxCombo}x</div>
            </div>
          </div>
        </div>
        
        {/* Visual Badge representing Champion */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--color-accent) 0%, rgba(0,0,0,0) 70%)',
            position: 'absolute',
            zIndex: -1,
            animation: 'float 4s ease-in-out infinite'
          }}></div>
          
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '3px solid var(--color-accent)',
            boxShadow: 'var(--shadow-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-secondary)',
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--color-accent)'
          }}>
            {champion.grade}
          </div>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>Global Rank #1</span>
        </div>
      </div>

      {/* Main Leaderboard Section */}
      <div className="panel">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Global Leaderboard</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Real-time performance rankings based on total Pose Points (pp).
            </p>
          </div>
          
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <input 
              type="text"
              placeholder="Search user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '0.6rem 1rem 0.6rem 2.5rem',
                color: 'var(--color-text)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                outline: 'none',
                width: '220px',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-left)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
            />
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="var(--color-text-muted)" 
              strokeWidth="2.5"
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th>Player</th>
                <th style={{ textAlign: 'center' }}>Grade</th>
                <th>Accuracy</th>
                <th>Max Combo</th>
                <th>Play Count</th>
                <th style={{ textAlign: 'right', color: 'var(--color-left)' }}>PP</th>
              </tr>
            </thead>
            <tbody>
              {filteredRankings.length > 0 ? (
                filteredRankings.map((player) => (
                  <tr key={player.rank}>
                    <td style={{ fontWeight: 800, color: player.rank <= 3 ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                      #{player.rank}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.35rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          color: 'var(--color-text-muted)'
                        }}>
                          {player.country}
                        </span>
                        <span style={{ fontWeight: 600 }}>{player.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontWeight: 800,
                        color: 
                          player.grade === 'SS' ? 'var(--color-accent)' : 
                          player.grade === 'S' ? 'var(--color-left)' : 'var(--color-text-muted)'
                      }}>
                        {player.grade}
                      </span>
                    </td>
                    <td>{player.accuracy}%</td>
                    <td>{player.maxCombo}x</td>
                    <td>{player.playCount}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-left)' }}>
                      {player.pp.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>
                    No players found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

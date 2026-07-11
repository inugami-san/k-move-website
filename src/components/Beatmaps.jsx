import React, { useState, useEffect, useRef } from 'react';

const mockBeatmaps = [
  { id: '5', title: 'Stormglass Arc', bpm: 125, length: 180, difficulty: 'Expert', notes: 142, creator: 'Inugami-san', type: 'Celestial Orchestral', freq: 160, color: 'linear-gradient(135deg, #c9994a 0%, #d1ac6b 100%)' },
  { id: '1', title: 'Neon Horizon', bpm: 120, length: 30, difficulty: 'Easy', notes: 38, creator: 'Antigravity', type: 'Synthwave', freq: 110, color: 'linear-gradient(135deg, #6baed6 0%, #4f8ab1 100%)' },
  { id: '2', title: 'Pose Calibrator', bpm: 130, length: 45, difficulty: 'Medium', notes: 65, creator: 'Christian', type: 'Chiptune', freq: 130, color: 'linear-gradient(135deg, #f5ede0 0%, #d1ac6b 100%)' },
  { id: '3', title: 'Radial Resonance', bpm: 140, length: 60, difficulty: 'Hard', notes: 112, creator: 'Inugami-san', type: 'Electronic', freq: 150, color: 'linear-gradient(135deg, #6baed6 0%, #c9994a 100%)' },
  { id: '4', title: 'Body Synthesizer', bpm: 150, length: 90, difficulty: 'Expert', notes: 184, creator: 'RhythmBot', type: 'Synthwave', freq: 180, color: 'linear-gradient(135deg, #8e94a5 0%, #121629 100%)' },
];

export default function Beatmaps() {
  const [filter, setFilter] = useState('All');
  const [playingId, setPlayingId] = useState(null);
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const visualizerCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioDataRef = useRef([]);

  // Synthesize dynamic preview beats using Web Audio API
  const startSynthPreview = (bpm, baseFreq) => {
    stopSynthPreview();
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    
    const intervalMs = (60 / bpm) * 1000;
    let step = 0;
    
    const playStep = () => {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
      
      const time = audioCtxRef.current.currentTime;
      
      // Kick drum
      const oscKick = ctx.createOscillator();
      const gainKick = ctx.createGain();
      oscKick.connect(gainKick);
      gainKick.connect(ctx.destination);
      
      oscKick.frequency.setValueAtTime(150, time);
      oscKick.frequency.exponentialRampToValueAtTime(0.01, time + 0.35);
      gainKick.gain.setValueAtTime(1.0, time);
      gainKick.gain.exponentialRampToValueAtTime(0.01, time + 0.35);
      
      oscKick.start(time);
      oscKick.stop(time + 0.35);
      
      // Melody note
      if (step % 2 === 0 || step % 3 === 0) {
        const oscMel = ctx.createOscillator();
        const gainMel = ctx.createGain();
        oscMel.connect(gainMel);
        gainMel.connect(ctx.destination);
        
        const noteFreqs = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 1.875];
        const currentFreq = noteFreqs[step % noteFreqs.length];
        
        oscMel.type = 'sawtooth';
        oscMel.frequency.setValueAtTime(currentFreq, time);
        gainMel.gain.setValueAtTime(0.12, time);
        gainMel.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        
        oscMel.start(time);
        oscMel.stop(time + 0.3);
      }
      
      step = (step + 1) % 8;
      
      // Populate visualization data (frequency bands representation)
      audioDataRef.current = Array.from({ length: 32 }, () => Math.random() * 85 + 15);
    };
    
    playStep();
    intervalRef.current = setInterval(playStep, intervalMs / 2);
  };

  const stopSynthPreview = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    audioDataRef.current = [];
    setPlayingId(null);
  };

  const handlePlayToggle = (track) => {
    if (playingId === track.id) {
      stopSynthPreview();
    } else {
      setPlayingId(track.id);
      startSynthPreview(track.bpm, track.freq);
    }
  };

  // Canvas visualizer animation
  useEffect(() => {
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const data = audioDataRef.current;
      
      if (playingId && data.length > 0) {
        const barWidth = canvas.width / data.length;
        
        // Render stylized wave bars
        for (let i = 0; i < data.length; i++) {
          const val = data[i];
          const grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - val);
          grad.addColorStop(0, '#d1ac6b'); // Gold
          grad.addColorStop(1, i % 2 === 0 ? '#6baed6' : '#c9994a'); // Celestial Blue or Amber Gold
          
          ctx.fillStyle = grad;
          ctx.shadowColor = i % 2 === 0 ? '#6baed6' : '#c9994a';
          ctx.shadowBlur = 4;
          ctx.fillRect(i * barWidth + 2, canvas.height - val, barWidth - 4, val);
          ctx.shadowBlur = 0; // reset
        }
      } else {
        // Draw flat line with faint noise animation
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        
        const segments = 20;
        const segmentWidth = canvas.width / segments;
        ctx.moveTo(0, canvas.height / 2);
        for (let j = 0; j <= segments; j++) {
          const rx = j * segmentWidth;
          const ry = canvas.height / 2 + Math.sin(j * 0.5) * 1.5;
          ctx.lineTo(rx, ry);
        }
        ctx.stroke();
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };
    
    render();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [playingId]);

  useEffect(() => {
    return () => {
      stopSynthPreview();
    };
  }, []);

  const filteredMaps = filter === 'All' 
    ? mockBeatmaps 
    : mockBeatmaps.filter(b => b.type === filter || (filter === 'Custom' && b.creator !== 'Antigravity' && b.creator !== 'Christian' && b.creator !== 'Inugami-san'));

  return (
    <div className="panel" style={{ minHeight: '620px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2.5rem',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Beatmap Browser</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', fontWeight: 300 }}>
            Browse and preview track beatmaps created for K Move camera pose-tracking.
          </p>
        </div>
        
        {/* visualizer canvas */}
        <canvas 
          ref={visualizerCanvasRef} 
          width="260" 
          height="60" 
          style={{
            background: '#040508',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.03)',
            boxShadow: 'inset 0 0 15px rgba(0,0,0,0.8)'
          }}
        />
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2.5rem',
        borderBottom: '1px solid var(--glass-border)',
        paddingBottom: '1rem',
        overflowX: 'auto'
      }}>
        {['All', 'Synthwave', 'Electronic', 'Chiptune', 'Custom'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              background: filter === tab ? 'var(--bg-tertiary)' : 'transparent',
              color: filter === tab ? 'var(--color-left)' : 'var(--color-text-muted)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              borderBottom: filter === tab ? '2px solid var(--color-left)' : 'none',
              transition: 'all 0.25s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Beatmaps Grid (Premium cards) */}
      <div className="grid-2">
        {filteredMaps.map((track) => (
          <div 
            key={track.id} 
            className="panel" 
            style={{
              padding: '1.5rem',
              display: 'flex',
              gap: '1.25rem',
              alignItems: 'center',
              border: playingId === track.id ? '1px solid var(--color-left)' : '1px solid var(--glass-border)',
              boxShadow: playingId === track.id ? '0 0 25px rgba(0, 229, 255, 0.15)' : 'none',
              transition: 'all var(--transition-speed)'
            }}
          >
            {/* Thumbnail artwork gradient */}
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '14px',
              background: track.color,
              flexShrink: 0,
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {playingId === track.id && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#fff',
                    animation: 'float 1s ease-in-out infinite'
                  }}></div>
                </div>
              )}
              🎵
            </div>

            {/* Song description */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '90px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{track.title}</h3>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    backgroundColor: 
                      track.difficulty === 'Easy' ? 'rgba(0, 229, 255, 0.08)' : 
                      track.difficulty === 'Medium' ? 'rgba(255, 235, 59, 0.08)' : 
                      track.difficulty === 'Hard' ? 'rgba(255, 69, 0, 0.08)' : 'rgba(213, 0, 249, 0.08)',
                    color: 
                      track.difficulty === 'Easy' ? 'var(--color-left)' : 
                      track.difficulty === 'Medium' ? '#ffeb3b' : 
                      track.difficulty === 'Hard' ? 'var(--color-right)' : 'var(--color-accent)',
                    border: `1px solid ${
                      track.difficulty === 'Easy' ? 'rgba(0, 229, 255, 0.15)' : 
                      track.difficulty === 'Medium' ? 'rgba(255, 235, 59, 0.15)' : 
                      track.difficulty === 'Hard' ? 'rgba(255, 69, 0, 0.15)' : 'rgba(213, 0, 249, 0.15)'
                    }`
                  }}>
                    {track.difficulty}
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '0.15rem' }}>Mapped by {track.creator}</span>
              </div>

              {/* Row statistics and Play Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 300 }}>
                  <span>{track.length}s</span>
                  <span>•</span>
                  <span>{track.bpm} BPM</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => handlePlayToggle(track)} 
                    style={{
                      border: 'none',
                      background: playingId === track.id ? 'var(--color-right)' : 'rgba(255,255,255,0.04)',
                      color: playingId === track.id ? '#fff' : 'var(--color-left)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: '1px solid rgba(255,255,255,0.03)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {playingId === track.id ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        Stop
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        Preview
                      </>
                    )}
                  </button>

                  <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); alert("Beatmap download requires the K Move desktop client!"); }} 
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      padding: '0.4rem',
                      color: 'var(--color-text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"/></svg>
                  </a>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

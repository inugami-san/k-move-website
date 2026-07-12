import React, { useEffect, useRef } from 'react';

export default function Home({ setActiveTab }) {
  const previewCanvasRef = useRef(null);

  // Passive ambient game field animation loop
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrame;
    let notes = [];
    let particles = [];
    let time = 0;
    
    // Config
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const hitRingRadius = 60;
    const spawnRadius = 140;
    
    // Angles in radians
    let leftCatcherAngle = Math.PI;
    let rightCatcherAngle = 0;
    
    let lastBeat = 0;
    let targetCoreRotation = 0;
    let coreRotation = 0;
    
    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background grid lines (faded)
      ctx.strokeStyle = 'rgba(209, 172, 107, 0.012)';
      ctx.lineWidth = 1;
      for (let i = 20; i < canvas.width; i += 20) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }
      
      // Draw Hit Ring
      ctx.strokeStyle = 'rgba(209, 172, 107, 0.12)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, hitRingRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Passive Spawner
      if (Math.random() < 0.03 && notes.length < 5) {
        const angleDeg = Math.floor(Math.random() * 8) * 45;
        const type = Math.random() > 0.5 ? 'leftHand' : 'rightHand';
        notes.push({
          radius: spawnRadius,
          angle: angleDeg * Math.PI / 180,
          type,
          speed: 90 // pixels per sec
        });
      }
      
      // Find closest note to guide auto-play catchers
      let nearestLeftNote = null;
      let nearestRightNote = null;
      let minLeftRadius = spawnRadius;
      let minRightRadius = spawnRadius;
      
      notes.forEach(note => {
        if (note.type === 'leftHand' && note.radius < minLeftRadius) {
          minLeftRadius = note.radius;
          nearestLeftNote = note;
        } else if (note.type === 'rightHand' && note.radius < minRightRadius) {
          minRightRadius = note.radius;
          nearestRightNote = note;
        }
      });
      
      // Lerp catcher angles to catch notes automatically (Autoplay simulation)
      if (nearestLeftNote) {
        const diffL = nearestLeftNote.angle - leftCatcherAngle;
        leftCatcherAngle += Math.atan2(Math.sin(diffL), Math.cos(diffL)) * 0.15;
      }
      if (nearestRightNote) {
        const diffR = nearestRightNote.angle - rightCatcherAngle;
        rightCatcherAngle += Math.atan2(Math.sin(diffR), Math.cos(diffR)) * 0.15;
      }
      
      // Update and Draw notes
      notes = notes.filter(note => {
        note.radius -= note.speed * 0.016;
        
        // Render note guide lines
        ctx.strokeStyle = note.type === 'leftHand' ? 'rgba(107, 173, 214, 0.02)' : 'rgba(201, 153, 74, 0.02)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + spawnRadius * Math.cos(note.angle), cy + spawnRadius * Math.sin(note.angle));
        ctx.stroke();
        
        // Draw note (Bullseye style: thin ring + center dot)
        const nx = cx + note.radius * Math.cos(note.angle);
        const ny = cy + note.radius * Math.sin(note.angle);
        const nColor = note.type === 'leftHand' ? '#6baed6' : '#c9994a';
        
        ctx.strokeStyle = nColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(nx, ny, 6, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = nColor;
        ctx.beginPath();
        ctx.arc(nx, ny, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Catch check
        if (note.radius <= hitRingRadius) {
          // Trigger particles ring
          for (let k = 0; k < 8; k++) {
            const pAngle = Math.random() * Math.PI * 2;
            const pSpeed = Math.random() * 40 + 20;
            particles.push({
              x: nx,
              y: ny,
              vx: Math.cos(pAngle) * pSpeed,
              vy: Math.sin(pAngle) * pSpeed,
              size: Math.random() * 2 + 1,
              color: nColor,
              alpha: 1
            });
          }
          return false; // remove
        }
        return true;
      });
      
      // Update and Draw particles
      particles = particles.filter(p => p.alpha > 0);
      particles.forEach(p => {
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        p.alpha -= 0.016 * 2.0;
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
      
      // Draw Catchers
      const lx = cx + hitRingRadius * Math.cos(leftCatcherAngle);
      const ly = cy + hitRingRadius * Math.sin(leftCatcherAngle);
      ctx.fillStyle = '#6baed6';
      ctx.shadowColor = '#6baed6';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(lx, ly, 10, 0, Math.PI * 2);
      ctx.fill();
      
      const rx = cx + hitRingRadius * Math.cos(rightCatcherAngle);
      const ry = cy + hitRingRadius * Math.sin(rightCatcherAngle);
      ctx.fillStyle = '#c9994a';
      ctx.shadowColor = '#c9994a';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(rx, ry, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // reset
      
      // Snap core diamond on beats
      const beatInterval = 0.5; // 120 bpm = 0.5s
      const currentBeat = Math.floor(time / beatInterval);
      if (currentBeat !== lastBeat) {
        lastBeat = currentBeat;
        targetCoreRotation += Math.PI / 4;
      }
      coreRotation += (targetCoreRotation - coreRotation) * 0.25;
      
      // Draw central Core (Diamond shape)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(coreRotation);
      ctx.fillStyle = '#05060b';
      ctx.strokeStyle = '#d1ac6b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = '#d1ac6b';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      animationFrame = requestAnimationFrame(render);
    };
    
    render();
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="home-container" style={{ display: 'flex', flexDirection: 'column', gap: '5rem' }}>
      {/* Modern Split-Hero Section */}
      <section className="hero-section" style={{
        padding: '3rem 0',
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '4rem',
        alignItems: 'center',
        position: 'relative',
        minHeight: '480px'
      }}>
        {/* Left Side: Taglines & Buttons */}
        <div>
          <span style={{
            fontSize: '0.85rem',
            fontWeight: 800,
            color: 'var(--color-accent)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '1rem',
            textShadow: 'var(--shadow-accent)'
          }}>
            GET DANCING. FEEL THE BEAT.
          </span>
          <h1 style={{
            fontSize: '4.8rem',
            fontWeight: 900,
            marginBottom: '1.25rem',
            letterSpacing: '-0.04em',
            lineHeight: '1.05'
          }}>
            K <span className="text-gradient-dual">MOVE</span>
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: 'var(--color-text-muted)',
            lineHeight: '1.75',
            marginBottom: '2.5rem',
            fontWeight: 300,
            maxWidth: '520px'
          }}>
            Transform your room into an arcade dance floor! Step in front of your camera, align your body, and catch sweeping beats with physical motion in real-time.
          </p>
          <div style={{
            display: 'flex',
            gap: '1.25rem',
            flexWrap: 'wrap'
          }}>
            <button onClick={() => setActiveTab('demo')} className="btn btn-cyan">
              Play Web Simulator
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
            <a href="#" className="btn btn-outline" onClick={(e) => { e.preventDefault(); alert("K Move Xcode project is ready inside the directory. Open 'K Move.xcodeproj' in Xcode and deploy to your Mac or iOS device."); }}>
              Download Client
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v16m-7-7 7 7 7-7M5 22h14"/></svg>
            </a>
          </div>
        </div>

        {/* Right Side: High Fidelity Game Preview */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* Radial back-glows */}
          <div style={{
            position: 'absolute',
            width: '320px',
            height: '320px',
            background: 'radial-gradient(circle, rgba(0, 229, 255, 0.08) 0%, rgba(255, 69, 0, 0.06) 50%, rgba(0,0,0,0) 70%)',
            filter: 'blur(30px)',
            zIndex: -1,
            animation: 'float 6s ease-in-out infinite'
          }}></div>

          <div className="panel" style={{
            padding: '1.5rem',
            background: 'rgba(5, 6, 12, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,255,255,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <canvas 
              ref={previewCanvasRef} 
              width="280" 
              height="280" 
              style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.02)'
              }}
            />
          </div>
        </div>
      </section>

      {/* Modern Value Proposition Cards */}
      <section>
        <h2 style={{
          fontSize: '2.25rem',
          fontWeight: 800,
          textAlign: 'center',
          marginBottom: '4rem',
          letterSpacing: '-0.02em'
        }}>
          How to Play <span className="text-gradient-cyan">K Move</span>
        </h2>
        
        <div className="grid-3">
          <div className="panel panel-left-glow floating-card" style={{ animationDelay: '0s', background: 'rgba(10, 12, 22, 0.45)' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(0, 229, 255, 0.08)',
              border: '1px solid rgba(0, 229, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.75rem',
              boxShadow: 'inset 0 0 10px rgba(0, 229, 255, 0.2)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-left)" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '0.8rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Full-Body Motion Control</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: '1.7', fontWeight: 300 }}>
              Just step back and let your camera track your hands. Being in position early rewards you with a PERFECT rating, giving you a friendly anticipation buffer!
            </p>
          </div>

          <div className="panel panel-accent-glow floating-card" style={{ animationDelay: '0.15s', background: 'rgba(10, 12, 22, 0.45)' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(213, 0, 249, 0.08)',
              border: '1px solid rgba(213, 0, 249, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.75rem',
              boxShadow: 'inset 0 0 10px rgba(213, 0, 249, 0.2)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8m-4-4v8"/></svg>
            </div>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '0.8rem', fontWeight: 700, letterSpacing: '-0.01em' }}>360° Circular Beats</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: '1.7', fontWeight: 300 }}>
              Notes sweep inward from all directions in full 360° patterns. Stay light on your feet, align your hands, and catch them to keep your combo alive!
            </p>
          </div>

          <div className="panel panel-right-glow floating-card" style={{ animationDelay: '0.3s', background: 'rgba(10, 12, 22, 0.45)' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(255, 69, 0, 0.08)',
              border: '1px solid rgba(255, 69, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.75rem',
              boxShadow: 'inset 0 0 10px rgba(255, 69, 0, 0.2)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-right)" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '0.8rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Dynamic Synth Soundtracks</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: '1.7', fontWeight: 300 }}>
              Play along to high-energy electronic chiptune tracks! Every hit triggers instant sound plucks, making you feel like part of the music.
            </p>
          </div>
        </div>
      </section>

      {/* Retro Sci-fi Grid Detailed Info Section */}
      <section style={{ position: 'relative' }}>
        <div className="panel" style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '4rem',
          alignItems: 'center',
          padding: '3.5rem',
          background: 'radial-gradient(ellipse at top left, rgba(18, 22, 38, 0.6) 0%, rgba(5,6,10,0.95) 100%)',
          borderRadius: '24px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-left)', fontWeight: 'bold', letterSpacing: '0.1em' }}>
              HARDWARE INTEGRATION
            </span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0.5rem 0 1.5rem', letterSpacing: '-0.02em' }}>
              Play Anywhere. <span className="text-gradient-orange">No Controllers Needed.</span>
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: '1.8', fontSize: '1rem', fontWeight: 300 }}>
              K Move turns your device's camera into an arcade motion sensor. Standing back automatically maps your body, letting you hit notes without holding any controllers. Combined with physical vibration feedbacks and smooth 120 FPS graphics, it feels as responsive as an arcade machine in the palm of your hand.
            </p>
            <ul style={{
              listStyle: 'none',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.25rem',
              marginBottom: '2.5rem'
            }}>
              {[
                'Zero controllers or extra sensors required',
                'Feel the beat with phone haptics',
                'Ultra-smooth high-refresh graphics',
                'Early-hit anticipation PERFECT rewards',
                '360° circular sweeping notes',
                'Dynamic sounds on every hit'
              ].map((feature, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem', fontWeight: 400 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-left)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button onClick={() => setActiveTab('leaderboard')} className="btn btn-outline">
              Check Global Rankings
            </button>
          </div>

          {/* Interactive UI Mockup Card */}
          <div style={{
            background: '#030408',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.03)',
            padding: '2rem',
            position: 'relative',
            aspectRatio: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9), 0 10px 30px rgba(0,0,0,0.5)'
          }}>
            {/* Radial game field mockup */}
            <div style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              border: '2px dashed rgba(255, 255, 255, 0.05)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Inner Hit Ring */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(255,255,255,0.05)'
              }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>COMBO</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>184</div>
              </div>

              {/* Left catcher (Cyan) */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '-12px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--color-left)',
                boxShadow: 'var(--shadow-left)',
                transform: 'translateY(-50%)',
                border: '2px solid #fff'
              }}></div>

              {/* Right catcher (Orange-Red) */}
              <div style={{
                position: 'absolute',
                top: '50%',
                right: '-12px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--color-right)',
                boxShadow: 'var(--shadow-right)',
                transform: 'translateY(-50%)',
                border: '2px solid #fff'
              }}></div>

              {/* Spawning Notes */}
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '30px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'var(--color-left)',
                boxShadow: 'var(--shadow-left)',
                border: '1.5px solid #fff'
              }}></div>

              <div style={{
                position: 'absolute',
                bottom: '35px',
                right: '25px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'var(--color-right)',
                boxShadow: 'var(--shadow-right)',
                border: '1.5px solid #fff'
              }}></div>
            </div>

            {/* Neon Accent lights labels */}
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '18px',
              fontSize: '0.75rem',
              color: 'var(--color-left)',
              fontWeight: 800,
              textShadow: 'var(--shadow-left)',
              letterSpacing: '0.05em'
            }}>LH TRACKING</div>

            <div style={{
              position: 'absolute',
              top: '15px',
              right: '18px',
              fontSize: '0.75rem',
              color: 'var(--color-right)',
              fontWeight: 800,
              textShadow: 'var(--shadow-right)',
              letterSpacing: '0.05em'
            }}>RH TRACKING</div>
          </div>
        </div>
      </section>

      {/* Dev Blog Updates */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2.5rem', letterSpacing: '-0.02em' }}>Dev Log Updates</h2>
        <div className="grid-2">
          <div className="panel" style={{ padding: '2rem', background: 'rgba(10, 12, 22, 0.5)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 800, letterSpacing: '0.05em' }}>VERSION 1.0 ALPHA</span>
            <h4 style={{ fontSize: '1.25rem', margin: '0.6rem 0', fontWeight: 700 }}>K Move Source Code Released</h4>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: '1.65', marginBottom: '1.5rem', fontWeight: 300 }}>
              The iOS/macOS game engine is up and running. Built using native Swift, SwiftUI navigation frameworks, and SpriteKit rendering modules. Stand calibration and camera capture pose estimation are fully integrated.
            </p>
            <a href="#" className="nav-link" style={{ fontSize: '0.9rem', color: 'var(--color-left)', fontWeight: 'bold' }} onClick={(e) => { e.preventDefault(); alert("Open Xcode and inspect GameScene.swift!"); }}>View Swift sources →</a>
          </div>

          <div className="panel" style={{ padding: '2rem', background: 'rgba(10, 12, 22, 0.5)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-left)', fontWeight: 800, letterSpacing: '0.05em' }}>ENGINE UPDATE</span>
            <h4 style={{ fontSize: '1.25rem', margin: '0.6rem 0', fontWeight: 700 }}>Procedural Music Synthesizer</h4>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: '1.65', marginBottom: '1.5rem', fontWeight: 300 }}>
              We've integrated a procedural MIDI-like synth wave generator that outputs dynamic kick drums, snare lines, and electronic square wave synth melodies on the fly, saving them into custom local beatmap arrays.
            </p>
            <a href="#" className="nav-link" style={{ fontSize: '0.9rem', color: 'var(--color-left)', fontWeight: 'bold' }} onClick={(e) => { e.preventDefault(); alert("Open SynthBeatGenerator.swift in project!"); }}>View Synth engine →</a>
          </div>
        </div>
      </section>
    </div>
  );
}

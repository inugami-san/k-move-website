import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

// Generates procedural notes for the demo based on BPM
const generateNotes = (bpm, durationSeconds) => {
  const notesList = [];
  const beatInterval = 60 / bpm; // seconds per beat
  const totalBeats = Math.floor(durationSeconds / beatInterval);
  
  for (let beat = 1; beat < totalBeats - 2; beat++) {
    // Spawn notes on beats or half-beats
    const hitTime = beat * beatInterval + 1.2; // Offset start by 1.2s travel time
    // Sweep angles across the circle (varying between 0 and 360 degrees) to match SynthBeatGenerator.swift
    const angle = (beat * 45) % 360;
    const type = Math.random() > 0.5 ? 'leftHand' : 'rightHand'; // left = cyan, right = orange
    
    notesList.push({
      id: `${beat}`,
      hitTime,
      spawnTime: hitTime - 1.2,
      angle: angle,
      type,
      caught: false,
      missed: false,
      trail: [] // note tail positions
    });
    
    // Add double notes on some beats for medium difficulty - spawned 180 degrees opposite
    if (beat % 4 === 0 && Math.random() > 0.4) {
      notesList.push({
        id: `${beat}-d`,
        hitTime: hitTime + beatInterval / 2,
        spawnTime: hitTime + beatInterval / 2 - 1.2,
        angle: (angle + 180) % 360,
        type: type === 'leftHand' ? 'rightHand' : 'leftHand',
        caught: false,
        missed: false,
        trail: []
      });
    }
  }
  return notesList;
};

export default function Demo({ session, userProfile, fetchUserProfile }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [controlMode, setControlMode] = useState('keyboard'); // 'keyboard' or 'mouse'
  const [isProMotion, setIsProMotion] = useState(true); // ProMotion simulated mode
  const [hitFeedback, setHitFeedback] = useState({ text: '', color: 'white', id: 0 });
  const [calibrationActive, setCalibrationActive] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  // Stats Counters
  const [perfectCount, setPerfectCount] = useState(0);
  const [goodCount, setGoodCount] = useState(0);
  const [niceCount, setNiceCount] = useState(0);
  const [okayCount, setOkayCount] = useState(0);
  const [missCount, setMissCount] = useState(0);

  const statsRef = useRef({ score: 0, maxCombo: 0, accuracy: 100, perfectCount: 0, goodCount: 0, niceCount: 0, okayCount: 0, missCount: 0 });
  useEffect(() => {
    statsRef.current = { score, maxCombo, accuracy, perfectCount, goodCount, niceCount, okayCount, missCount };
  }, [score, maxCombo, accuracy, perfectCount, goodCount, niceCount, okayCount, missCount]);

  const submitScoreToDatabase = async (finalScore, finalCombo, finalAccuracy, p, g, n, o, m) => {
    const activeUsername = session && userProfile 
      ? userProfile.username 
      : (localStorage.getItem('kmove_guest_username') || 'Guest_Challenger');

    const earnedPP = Math.round((finalAccuracy / 100) * 1000 * (1 + finalCombo / 100));
    
    let achievedGrade = 'A';
    if (finalAccuracy >= 99.0) achievedGrade = 'SS';
    else if (finalAccuracy >= 97.0) achievedGrade = 'S';
    else if (finalAccuracy >= 90.0) achievedGrade = 'A';
    else if (finalAccuracy >= 80.0) achievedGrade = 'B';
    else achievedGrade = 'C';

    try {
      const scoreEntry = {
        profile_id: session ? session.user.id : null,
        username: activeUsername,
        accuracy: finalAccuracy,
        max_combo: finalCombo,
        score: finalScore,
        pp: earnedPP,
        grade: achievedGrade,
        song_title: 'Neon Horizon'
      };

      const { error: scoreErr } = await supabase
        .from('scores')
        .insert(scoreEntry);

      if (scoreErr) {
        console.error('Error logging score to Supabase:', scoreErr);
        return;
      }

      console.log('Score logged to Supabase successfully!');

      if (session && userProfile) {
        const newPlayCount = userProfile.play_count + 1;
        let newAvgAccuracy = finalAccuracy;
        if (userProfile.play_count > 0) {
          newAvgAccuracy = (userProfile.avg_accuracy * userProfile.play_count + finalAccuracy) / newPlayCount;
        }

        const newPerfect = userProfile.perfect_count + p;
        const newGood = userProfile.good_count + g;
        const newNice = userProfile.nice_count + n;
        const newOkay = userProfile.okay_count + o;
        const newMiss = userProfile.miss_count + m;
        const newPP = userProfile.pp + earnedPP;

        const gradesOrder = ['C', 'B', 'A', 'S', 'SS'];
        let newGrade = userProfile.grade || 'A';
        if (gradesOrder.indexOf(achievedGrade) > gradesOrder.indexOf(newGrade)) {
          newGrade = achievedGrade;
        }

        const { error: profileErr } = await supabase
          .from('profiles')
          .update({
            play_count: newPlayCount,
            avg_accuracy: newAvgAccuracy,
            perfect_count: newPerfect,
            good_count: newGood,
            nice_count: newNice,
            okay_count: newOkay,
            miss_count: newMiss,
            pp: newPP,
            grade: newGrade,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id);

        if (profileErr) {
          console.error('Error updating profile stats:', profileErr);
        } else {
          console.log('Profile stats updated successfully!');
          fetchUserProfile(session.user.id);
        }
      }
    } catch (err) {
      console.error('Error submitting score details:', err);
    }
  };

  const canvasRef = useRef(null);
  const skeletonCanvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const notesRef = useRef([]);
  const keysPressed = useRef({});
  const mouseAngleRef = useRef(0);
  const gameLoopRef = useRef(null);
  const skeletonLoopRef = useRef(null);
  const timeRef = useRef(0);
  
  // Game visual enhancements arrays
  const particlesRef = useRef([]);
  const shockwavesRef = useRef([]);
  const gridPulseRef = useRef(0); // flash intensity
  const screenShakeIntensityRef = useRef(0);
  const isProMotionRef = useRef(true);
  
  // Previous catcher angles for motion blur calculation
  const prevLeftAngleRef = useRef(Math.PI);
  const prevRightAngleRef = useRef(0);

  // Catcher Angles (Radians)
  const leftAngleRef = useRef(Math.PI);
  const rightAngleRef = useRef(0);

  useEffect(() => {
    isProMotionRef.current = isProMotion;
  }, [isProMotion]);

  // Audio setup
  const playSynthTone = (freq, duration, type = 'sine', gainVal = 0.15) => {
    if (!audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      // Zero-latency keysound configuration: fast attack, exponential decay
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 0.003);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio node failure", e);
    }
  };

  const handleStartGame = () => {
    if (isPlaying) return;
    
    // Initialize AudioContext
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtxRef.current = new AudioContext();

    // Reset stats
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setAccuracy(100);
    setPerfectCount(0);
    setGoodCount(0);
    setNiceCount(0);
    setOkayCount(0);
    setMissCount(0);
    particlesRef.current = [];
    shockwavesRef.current = [];
    gridPulseRef.current = 0;
    
    // Generate new beatmap notes
    notesRef.current = generateNotes(120, 30);
    leftAngleRef.current = Math.PI;
    rightAngleRef.current = 0;
    
    setIsPlaying(true);
    timeRef.current = 0;
    
    // Play intro sound
    setTimeout(() => {
      playSynthTone(220, 0.4, 'triangle', 0.2);
      setTimeout(() => playSynthTone(330, 0.4, 'triangle', 0.2), 150);
      setTimeout(() => playSynthTone(440, 0.6, 'sawtooth', 0.2), 300);
    }, 100);
  };

  const handleStopGame = () => {
    setIsPlaying(false);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  };

  // Keys Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      keysPressed.current[e.key] = true;
    };
    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse move listener
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    mouseAngleRef.current = Math.atan2(dy, dx);
  };

  // Run calibration routine
  const startCalibration = () => {
    if (calibrationActive) return;
    setCalibrationActive(true);
    setCalibrationProgress(0);
    playSynthTone(587.33, 0.2, 'sine', 0.2);
  };

  useEffect(() => {
    if (!calibrationActive) return;
    const interval = setInterval(() => {
      setCalibrationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setCalibrationActive(false);
          playSynthTone(880, 0.4, 'sine', 0.25);
          return 100;
        }
        if (prev % 20 === 0) {
          playSynthTone(440, 0.1, 'sine', 0.15);
        }
        return prev + 5;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [calibrationActive]);

  // Simulated skeletal wireframe animation loop
  useEffect(() => {
    const canvas = skeletonCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let time = 0;
    
    const drawSkeleton = () => {
      time += 0.03;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Stand-in background camera view representation
      ctx.fillStyle = '#060810';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      for (let i = 20; i < canvas.width; i += 20) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }

      // Camera crop borders
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      
      // Simulated Body Coordinates
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      // Floating/idle body movements
      const idleBob = Math.sin(time) * 4;
      const headX = cx;
      const headY = cy - 35 + idleBob;
      
      const neckX = cx;
      const neckY = cy - 15 + idleBob;
      
      const lShoulderX = cx - 35;
      const lShoulderY = cy - 10 + idleBob;
      
      const rShoulderX = cx + 35;
      const rShoulderY = cy - 10 + idleBob;
      
      const spineX = cx;
      const spineY = cy + 25 + idleBob;
      
      // Calculate dynamic hand coordinates linked to active catcher angles
      const leftAngle = leftAngleRef.current;
      const rightAngle = rightAngleRef.current;
      
      // Hands track the radial catcher angles to show alignment
      const radius = 55;
      const lWristX = cx + radius * Math.cos(leftAngle);
      const lWristY = cy + radius * Math.sin(leftAngle) + idleBob;
      
      const rWristX = cx + radius * Math.cos(rightAngle);
      const rWristY = cy + radius * Math.sin(rightAngle) + idleBob;
      
      // Mathematical projection for elbows (midway joint simulation)
      const lElbowX = (lShoulderX + lWristX) / 2 + Math.sin(time * 0.5) * 5;
      const lElbowY = (lShoulderY + lWristY) / 2 + 10;
      
      const rElbowX = (rShoulderX + rWristX) / 2 + Math.cos(time * 0.5) * 5;
      const rElbowY = (rShoulderY + rWristY) / 2 + 10;
      
      // Draw Skeleton Lines (Celestial Blue / Gold / Cream)
      ctx.strokeStyle = '#6baed6'; // Celestial Blue
      ctx.shadowColor = '#6baed6';
      ctx.shadowBlur = 4;
      ctx.lineWidth = 2.5;
      
      // Head
      ctx.beginPath();
      ctx.arc(headX, headY, 14, 0, Math.PI * 2);
      ctx.stroke();
      
      // Face crosshairs (Webcam track mockup)
      ctx.strokeStyle = 'rgba(107, 173, 214, 0.25)';
      ctx.beginPath();
      ctx.moveTo(headX - 6, headY); ctx.lineTo(headX + 6, headY);
      ctx.moveTo(headX, headY - 6); ctx.lineTo(headX, headY + 6);
      ctx.stroke();
      
      ctx.strokeStyle = '#6baed6';
      // Neck & Shoulders
      ctx.beginPath();
      ctx.moveTo(headX, headY + 14);
      ctx.lineTo(neckX, neckY);
      ctx.lineTo(lShoulderX, lShoulderY);
      ctx.moveTo(neckX, neckY);
      ctx.lineTo(rShoulderX, rShoulderY);
      ctx.stroke();
      
      // Spine
      ctx.beginPath();
      ctx.moveTo(neckX, neckY);
      ctx.lineTo(spineX, spineY);
      ctx.stroke();
      
      // Left arm (Shoulder -> Elbow -> Wrist)
      ctx.strokeStyle = '#6baed6';
      ctx.beginPath();
      ctx.moveTo(lShoulderX, lShoulderY);
      ctx.lineTo(lElbowX, lElbowY);
      ctx.lineTo(lWristX, lWristY);
      ctx.stroke();

      // Right arm (Shoulder -> Elbow -> Wrist)
      ctx.strokeStyle = '#c9994a'; // Amber Gold
      ctx.shadowColor = '#c9994a';
      ctx.beginPath();
      ctx.moveTo(rShoulderX, rShoulderY);
      ctx.lineTo(rElbowX, rElbowY);
      ctx.lineTo(rWristX, rWristY);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
      
      // Joint nodes
      const joints = [
        { x: neckX, y: neckY, col: '#f5ede0' },
        { x: lShoulderX, y: lShoulderY, col: '#6baed6' },
        { x: rShoulderX, y: rShoulderY, col: '#c9994a' },
        { x: lElbowX, y: lElbowY, col: '#6baed6' },
        { x: rElbowX, y: rElbowY, col: '#c9994a' },
        { x: spineX, y: spineY, col: '#f5ede0' }
      ];
      
      joints.forEach(j => {
        ctx.fillStyle = j.col;
        ctx.beginPath();
        ctx.arc(j.x, j.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Glowing Hands / Wrists Nodes
      ctx.fillStyle = '#6baed6';
      ctx.shadowColor = '#6baed6';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(lWristX, lWristY, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#c9994a';
      ctx.shadowColor = '#c9994a';
      ctx.beginPath();
      ctx.arc(rWristX, rWristY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Calibration HUD overlays
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(245, 237, 224, 0.4)';
      ctx.fillText('CAM FEED IN: 60FPS', 20, 30);
      ctx.fillText('CALIBRATION: ACTIVE', 20, 45);
      
      // Render coordinate values
      ctx.fillStyle = '#6baed6';
      ctx.fillText(`LH_ANGLE: ${(leftAngle * 180 / Math.PI).toFixed(0)}°`, 20, canvas.height - 35);
      ctx.fillStyle = '#c9994a';
      ctx.fillText(`RH_ANGLE: ${(rightAngle * 180 / Math.PI).toFixed(0)}°`, 20, canvas.height - 20);

      // Pulse scanline
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(10, 10 + (Math.sin(time) * 0.5 + 0.5) * (canvas.height - 22), canvas.width - 20, 2);

      skeletonLoopRef.current = requestAnimationFrame(drawSkeleton);
    };
    
    drawSkeleton();
    return () => {
      if (skeletonLoopRef.current) cancelAnimationFrame(skeletonLoopRef.current);
    };
  }, []);

  // Main Game Loop
  useEffect(() => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let lastTime = performance.now();
    
    const update = (timestamp) => {
      // 60FPS Cap: If ProMotion is disabled, skip frames to enforce ~16.6ms intervals
      if (!isProMotionRef.current) {
        if (timestamp - lastTime < 16.0) {
          gameLoopRef.current = requestAnimationFrame(update);
          return;
        }
      }
      
      const dt = Math.min(0.1, (timestamp - lastTime) / 1000);
      lastTime = timestamp;
      
      // Update song time
      timeRef.current += dt;
      const songTime = timeRef.current;
      
      // 1. Clear Canvas & Apply Screen Shake (Tactile Impact Simulation)
      ctx.fillStyle = '#040508';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      screenShakeIntensityRef.current = Math.max(0, screenShakeIntensityRef.current - dt * 20);
      if (screenShakeIntensityRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeIntensityRef.current;
        const shakeY = (Math.random() - 0.5) * screenShakeIntensityRef.current;
        ctx.translate(shakeX, shakeY);
      }
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const hitRingRadius = 90;
      const spawnRadius = 230;

      // Decay grid pulse flash
      gridPulseRef.current = Math.max(0, gridPulseRef.current - dt * 2);
      
      // 2. Draw Perspective Grid Background (Wow factor!)
      ctx.strokeStyle = `rgba(209, 172, 107, ${0.025 + gridPulseRef.current * 0.08})`;
      ctx.lineWidth = 1;
      
      // Radial lines from center (elegant spokes)
      const radialLines = 16;
      for (let rIdx = 0; rIdx < radialLines; rIdx++) {
        const radAngle = (rIdx / radialLines) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + spawnRadius * 1.5 * Math.cos(radAngle), cy + spawnRadius * 1.5 * Math.sin(radAngle));
        ctx.stroke();
      }
      
      // Concentric circles
      const ringSteps = 4;
      for (let sIdx = 1; sIdx <= ringSteps; sIdx++) {
        const radStep = hitRingRadius + ((spawnRadius - hitRingRadius) / ringSteps) * sIdx;
        ctx.strokeStyle = `rgba(209, 172, 107, ${0.012 + gridPulseRef.current * 0.04})`;
        ctx.beginPath();
        ctx.arc(cx, cy, radStep, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // 3. Draw Hit Ring Perimeter (Glowing layout)
      ctx.strokeStyle = gridPulseRef.current > 0.5 ? 'rgba(209, 172, 107, 0.5)' : 'rgba(209, 172, 107, 0.15)';
      ctx.shadowColor = '#d1ac6b';
      ctx.shadowBlur = gridPulseRef.current * 10;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(cx, cy, hitRingRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
      
      // 4. Update Catcher Angles
      if (controlMode === 'keyboard') {
        const speed = 4.2 * dt;
        if (keysPressed.current['a']) leftAngleRef.current -= speed;
        if (keysPressed.current['d']) leftAngleRef.current += speed;
        
        if (keysPressed.current['arrowleft'] || keysPressed.current['j']) rightAngleRef.current -= speed;
        if (keysPressed.current['arrowright'] || keysPressed.current['l']) rightAngleRef.current += speed;
      } else {
        const targetLeft = mouseAngleRef.current;
        const targetRight = mouseAngleRef.current + Math.PI;
        
        const diffL = targetLeft - leftAngleRef.current;
        const normL = Math.atan2(Math.sin(diffL), Math.cos(diffL));
        leftAngleRef.current += normL * 0.28;

        const diffR = targetRight - rightAngleRef.current;
        const normR = Math.atan2(Math.sin(diffR), Math.cos(diffR));
        rightAngleRef.current += normR * 0.28;
      }
      
      leftAngleRef.current = (leftAngleRef.current + Math.PI * 2) % (Math.PI * 2);
      rightAngleRef.current = (rightAngleRef.current + Math.PI * 2) % (Math.PI * 2);
      
      // 5. Draw Catchers (Celestial Blue and Amber Gold)
      const catcherSize = 14;
      
      // Optional ProMotion Motion Blur Trail
      if (isProMotionRef.current) {
        // Draw trailing left catcher
        const tLeftAngle = prevLeftAngleRef.current + Math.atan2(Math.sin(leftAngleRef.current - prevLeftAngleRef.current), Math.cos(leftAngleRef.current - prevLeftAngleRef.current)) * 0.5;
        const tlx = cx + hitRingRadius * Math.cos(tLeftAngle);
        const tly = cy + hitRingRadius * Math.sin(tLeftAngle);
        ctx.fillStyle = 'rgba(107, 173, 214, 0.35)'; // Faint celestial blue
        ctx.beginPath();
        ctx.arc(tlx, tly, catcherSize - 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw trailing right catcher
        const tRightAngle = prevRightAngleRef.current + Math.atan2(Math.sin(rightAngleRef.current - prevRightAngleRef.current), Math.cos(rightAngleRef.current - prevRightAngleRef.current)) * 0.5;
        const trx = cx + hitRingRadius * Math.cos(tRightAngle);
        const tryVal = cy + hitRingRadius * Math.sin(tRightAngle);
        ctx.fillStyle = 'rgba(201, 153, 74, 0.35)'; // Faint amber gold
        ctx.beginPath();
        ctx.arc(trx, tryVal, catcherSize - 1, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Update previous angles
      prevLeftAngleRef.current = leftAngleRef.current;
      prevRightAngleRef.current = rightAngleRef.current;
      
      // Left Catcher (Celestial Blue)
      const lx = cx + hitRingRadius * Math.cos(leftAngleRef.current);
      const ly = cy + hitRingRadius * Math.sin(leftAngleRef.current);
      ctx.fillStyle = '#6baed6';
      ctx.shadowColor = '#6baed6';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(lx, ly, catcherSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Right Catcher (Amber Gold)
      const rx = cx + hitRingRadius * Math.cos(rightAngleRef.current);
      const ry = cy + hitRingRadius * Math.sin(rightAngleRef.current);
      ctx.fillStyle = '#c9994a';
      ctx.shadowColor = '#c9994a';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(rx, ry, catcherSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 6. Update and Draw Shockwaves
      shockwavesRef.current = shockwavesRef.current.filter(sw => sw.alpha > 0);
      shockwavesRef.current.forEach(sw => {
        sw.radius += sw.speed * dt;
        sw.alpha -= dt * 2.0;
        
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1.0; // reset

      // 7. Update and Draw Particles (Laser Spark Lines)
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= dt * 2.0; // slightly faster fade out
        
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        // Draw tail vector in opposite direction of velocity (laser tail)
        ctx.lineTo(p.x - p.vx * 0.08, p.y - p.vy * 0.08);
        ctx.stroke();
      });
      ctx.globalAlpha = 1.0;

      // 8. Spawn, Update and Draw Notes
      const notes = notesRef.current;
      
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        if (note.missed) continue;
        if (note.caught) {
          // If caught, draw the pop-expansion animation for 0.15 seconds
          if (note.caughtTime) {
            const elapsed = songTime - note.caughtTime;
            if (elapsed < 0.15) {
              const noteAngleRad = note.angle * Math.PI / 180;
              const nx = cx + hitRingRadius * Math.cos(noteAngleRad);
              const ny = cy + hitRingRadius * Math.sin(noteAngleRad);
              
              // Scale pop-expansion up to 2.2x size (from 8px to 18px)
              const popSize = 8 + (elapsed / 0.15) * 10;
              const popColor = note.type === 'leftHand' ? '#6baed6' : '#c9994a';
              ctx.fillStyle = popColor;
              ctx.globalAlpha = 1.0 - (elapsed / 0.15); // fade out
              ctx.beginPath();
              ctx.arc(nx, ny, popSize, 0, Math.PI * 2);
              ctx.fill();
              
              // Glowing border line ring
              ctx.strokeStyle = popColor;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(nx, ny, popSize + 4, 0, Math.PI * 2);
              ctx.stroke();
              
              ctx.globalAlpha = 1.0; // reset
            }
          }
          continue;
        }
        
        if (songTime >= note.spawnTime) {
          const tRemaining = note.hitTime - songTime;
          
          if (tRemaining > -0.15 && tRemaining <= 1.2) {
            const progress = Math.max(0, 1 - tRemaining / 1.2);
            const currentRadius = spawnRadius - (spawnRadius - hitRingRadius) * progress;
            
            const noteAngleRad = note.angle * Math.PI / 180;
            const nx = cx + currentRadius * Math.cos(noteAngleRad);
            const ny = cy + currentRadius * Math.sin(noteAngleRad);
            
            // Append positions to note trail
            note.trail.push({ x: nx, y: ny, alpha: 0.6 });
            if (note.trail.length > 5) note.trail.shift();
            
            // Render Note Trails
            note.trail.forEach((pos, idx) => {
              ctx.fillStyle = note.type === 'leftHand' ? 'rgba(107, 173, 214, 0.2)' : 'rgba(201, 153, 74, 0.2)';
              ctx.globalAlpha = pos.alpha * (idx / note.trail.length);
              ctx.beginPath();
              ctx.arc(pos.x, pos.y, 4 + (idx / note.trail.length) * 3, 0, Math.PI * 2);
              ctx.fill();
            });
            ctx.globalAlpha = 1.0; // reset
            
            // Draw actual beat note (Bullseye style: thin ring stroke + center dot)
            const nColor = note.type === 'leftHand' ? '#6baed6' : '#c9994a';
            ctx.strokeStyle = nColor;
            ctx.lineWidth = 1.8;
            ctx.shadowColor = nColor;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(nx, ny, 8, 0, Math.PI * 2); // outer ring
            ctx.stroke();
            
            ctx.fillStyle = nColor;
            ctx.beginPath();
            ctx.arc(nx, ny, 2.5, 0, Math.PI * 2); // inner dot
            ctx.fill();
            ctx.shadowBlur = 0; // reset
            
            // Approach circular rings
            if (tRemaining > 0) {
              ctx.strokeStyle = note.type === 'leftHand' ? 'rgba(107, 173, 214, 0.3)' : 'rgba(201, 153, 74, 0.3)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(nx, ny, 8 + tRemaining * 20, 0, Math.PI * 2);
              ctx.stroke();
            }

            // Hit collision evaluation inside hit window
            if (Math.abs(tRemaining) < 0.28) {
              const catcherAngle = note.type === 'leftHand' ? leftAngleRef.current : rightAngleRef.current;
              
              let diff = Math.abs(catcherAngle - noteAngleRad);
              diff = diff % (Math.PI * 2);
              if (diff > Math.PI) diff = Math.PI * 2 - diff;
              
              if (diff < 0.6) {
                note.caught = true;
                note.caughtTime = songTime; // Set caught time for pop animation
                evaluateHit(tRemaining, note.type, nx, ny);
                continue;
              }
            }
          }
          
          if (tRemaining <= -0.15) {
            note.missed = true;
            registerMiss();
          }
        }
      }

      // 9. Draw central Core node (Snapping Gold Diamond)
      const beatInterval = 0.5; // 120 bpm = 0.5s
      const currentBeat = Math.floor(songTime / beatInterval);
      if (!canvas.lastBeatIndex) canvas.lastBeatIndex = 0;
      if (!canvas.coreRotationAngle) canvas.coreRotationAngle = 0;
      if (!canvas.targetCoreRotation) canvas.targetCoreRotation = 0;
      
      if (currentBeat !== canvas.lastBeatIndex) {
        canvas.lastBeatIndex = currentBeat;
        canvas.targetCoreRotation += Math.PI / 4;
      }
      canvas.coreRotationAngle += (canvas.targetCoreRotation - canvas.coreRotationAngle) * 0.25;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(canvas.coreRotationAngle);
      
      ctx.fillStyle = '#05060b';
      ctx.strokeStyle = '#d1ac6b'; // goldColor
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Core glowing center
      ctx.fillStyle = '#d1ac6b';
      ctx.shadowColor = '#d1ac6b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore(); // Restore screen shake transform
      
      if (songTime >= 31.5) {
        handleStopGame();
        const currentStats = statsRef.current;
        submitScoreToDatabase(
          currentStats.score,
          currentStats.maxCombo,
          currentStats.accuracy,
          currentStats.perfectCount,
          currentStats.goodCount,
          currentStats.niceCount,
          currentStats.okayCount,
          currentStats.missCount
        );
        alert(`Song Finished!\nFinal Score: ${currentStats.score}\nMax Combo: ${currentStats.maxCombo}\nAccuracy: ${currentStats.accuracy.toFixed(1)}%`);
      } else {
        gameLoopRef.current = requestAnimationFrame(update);
      }
    };
    
    const evaluateHit = (tRemaining, type, x, y) => {
      // In Camera / Simulator Mode, being in position early (tRemaining > 0) rewards anticipation
      // and counts as a PERFECT timing hit, matching native Swift GameScene.swift logic
      const absDiff = tRemaining > 0 ? 0.0 : Math.abs(tRemaining);
      let rating = '';
      let pts = 0;
      let col = '#fff';
      let synthFreq = 440;
      
      if (absDiff <= 0.08) {
        rating = 'PERFECT';
        pts = 1000;
        col = '#6baed6'; // Celestial Blue PERFECT color
        setPerfectCount(prev => prev + 1);
        synthFreq = type === 'leftHand' ? 523.25 : 659.25;
        
        // Haptic feedback & screen shake simulation (PERFECT)
        screenShakeIntensityRef.current = 3.8;
        if (navigator.vibrate) navigator.vibrate(30);
      } else if (absDiff <= 0.15) {
        rating = 'GOOD';
        pts = 750;
        col = '#00e676';
        setGoodCount(prev => prev + 1);
        synthFreq = type === 'leftHand' ? 392.00 : 493.88;
        
        screenShakeIntensityRef.current = 2.0;
        if (navigator.vibrate) navigator.vibrate(20);
      } else if (absDiff <= 0.22) {
        rating = 'NICE';
        pts = 500;
        col = '#ffeb3b';
        setNiceCount(prev => prev + 1);
        synthFreq = 293.66;
        
        screenShakeIntensityRef.current = 1.2;
        if (navigator.vibrate) navigator.vibrate(15);
      } else {
        rating = 'OKAY';
        pts = 250;
        col = '#ff9100';
        setOkayCount(prev => prev + 1);
        synthFreq = 220.00;
        
        screenShakeIntensityRef.current = 0.8;
        if (navigator.vibrate) navigator.vibrate(10);
      }
      
      // Update combo and score
      setCombo(prev => {
        const nextCombo = prev + 1;
        setMaxCombo(mc => Math.max(mc, nextCombo));
        const mult = 1 + Math.min(3, Math.floor(nextCombo / 10));
        setScore(sc => sc + pts * mult);
        return nextCombo;
      });
      
      // Pulse grid flash on hits
      gridPulseRef.current = 1.0;
      
      // Play synth feedback tone
      playSynthTone(synthFreq, 0.15, 'triangle', 0.15);
      
      // Spawn hit shockwaves (Wow factor!)
      const swColor = type === 'leftHand' ? 'rgba(107, 173, 214, 0.6)' : 'rgba(201, 153, 74, 0.6)';
      shockwavesRef.current.push({
        x,
        y,
        radius: 12,
        speed: 160,
        alpha: 1.0,
        color: swColor
      });
      
      // Update accuracy
      updateAccuracy(true);
      
      // Particles sparks
      const pColor = type === 'leftHand' ? '#6baed6' : '#c9994a';
      for (let pIdx = 0; pIdx < 16; pIdx++) {
        const pAngle = Math.random() * Math.PI * 2;
        const pSpeed = Math.random() * 110 + 50;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          size: Math.random() * 3 + 1.5,
          color: pColor,
          alpha: 1.0
        });
      }
      
      setHitFeedback({ text: rating, color: col, id: Date.now() });
    };

    const registerMiss = () => {
      setCombo(0);
      setMissCount(prev => prev + 1);
      updateAccuracy(false);
      
      // Haptic shake & vibration pattern for Miss
      screenShakeIntensityRef.current = 7.0;
      if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      
      playSynthTone(90, 0.25, 'sawtooth', 0.1);
      setHitFeedback({ text: 'MISS', color: '#ff1744', id: Date.now() });
    };
    
    const updateAccuracy = (isHit) => {
      setPerfectCount(p => {
        setGoodCount(g => {
          setNiceCount(n => {
            setOkayCount(o => {
              setMissCount(m => {
                const total = p + g + n + o + m;
                if (total === 0) return p;
                const weighted = (p * 100 + g * 75 + n * 50 + o * 25);
                const maxVal = total * 100;
                setAccuracy((weighted / maxVal) * 100);
                return p;
              });
              return o;
            });
            return n;
          });
          return g;
        });
        return p;
      });
    };

    gameLoopRef.current = requestAnimationFrame(update);
    
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [isPlaying, controlMode, score]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '3rem', alignItems: 'flex-start' }}>
      
      {/* Visual Canvas Demo Container */}
      <div className="panel" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#040508',
        border: '1px solid var(--glass-border)',
        position: 'relative'
      }}>
        
        {/* Selection bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--glass-border)',
          paddingBottom: '1rem',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Web Play Simulator</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Interactive canvas catcher</span>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => setIsProMotion(p => !p)}
              style={{
                fontSize: '0.7rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: `1px solid ${isProMotion ? 'var(--color-accent)' : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer',
                background: isProMotion ? 'rgba(209, 172, 107, 0.08)' : 'transparent',
                color: isProMotion ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontWeight: 'bold',
                marginRight: '0.5rem',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: isProMotion ? '#00e676' : '#8e94a5' }}></span>
              PROMOTION 120HZ
            </button>
            <button 
              onClick={() => setControlMode('keyboard')}
              style={{
                fontSize: '0.75rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: controlMode === 'keyboard' ? 'var(--color-left)' : 'rgba(255,255,255,0.06)',
                color: controlMode === 'keyboard' ? '#000' : 'var(--color-text-muted)',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              KEYBOARD
            </button>
            <button 
              onClick={() => setControlMode('mouse')}
              style={{
                fontSize: '0.75rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: controlMode === 'mouse' ? 'var(--color-left)' : 'rgba(255,255,255,0.06)',
                color: controlMode === 'mouse' ? '#000' : 'var(--color-text-muted)',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              MOUSE
            </button>
          </div>
        </div>

        {/* Playfield Canvas Container */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '380px', aspectRatio: '1/1' }} onMouseMove={handleMouseMove}>
          <canvas 
            ref={canvasRef} 
            width="380" 
            height="380" 
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.03)',
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)'
            }}
          />
          
          {/* Overlay Score & Combo */}
          {isPlaying && (
            <>
              <div style={{ position: 'absolute', top: '12px', left: '16px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 800, letterSpacing: '0.05em' }}>SCORE</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-left)', textShadow: 'var(--shadow-left)' }}>{score}</span>
              </div>
              
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                background: 'rgba(5, 6, 11, 0.65)',
                border: '1px solid var(--glass-border)',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                color: isProMotion ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontWeight: 800,
                textShadow: isProMotion ? 'var(--shadow-accent)' : 'none',
                letterSpacing: '0.05em',
                backdropFilter: 'blur(4px)'
              }}>
                {isProMotion ? '⚡ PROMOTION 120HZ ACTIVE' : '60HZ FRAME LOCKED'}
              </div>

              <div style={{ position: 'absolute', top: '12px', right: '16px', textAlign: 'right' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 800, letterSpacing: '0.05em' }}>ACCURACY</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900 }}>{accuracy.toFixed(1)}%</span>
              </div>
              
              {/* Central Accuracy Feedback indicator */}
              <div key={hitFeedback.id} style={{
                position: 'absolute',
                top: '55%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                animation: hitFeedback.text ? 'float 0.4s ease-out forwards' : 'none'
              }}>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: hitFeedback.color,
                  textShadow: `0 0 15px ${hitFeedback.color}`
                }}>
                  {hitFeedback.text}
                </span>
                
                {combo > 0 && (
                  <span style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    color: '#fff',
                    fontWeight: 900,
                    marginTop: '2px',
                    letterSpacing: '0.05em'
                  }}>
                    {combo}x Combo
                  </span>
                )}
              </div>
            </>
          )}

          {/* Intro Start Overlay */}
          {!isPlaying && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(4, 5, 8, 0.88)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '16px',
              padding: '2rem',
              backdropFilter: 'blur(4px)'
            }}>
              <h4 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Ready to Move?</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '300px', marginBottom: '2rem', lineHeight: '1.6', fontWeight: 300 }}>
                {controlMode === 'keyboard' 
                  ? 'Steer Left catcher (Cyan) with A / D. Steer Right catcher (Red) with Left / Right Arrows.' 
                  : 'Move your mouse. Left catcher follows pointer angle, Right catcher follows the exact opposite angle.'}
              </p>
              <button onClick={handleStartGame} className="btn btn-cyan">
                Start Game Loop
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Bottom controls */}
        {isPlaying && (
          <button onClick={handleStopGame} className="btn btn-outline" style={{ marginTop: '1.5rem', fontSize: '0.8rem', padding: '0.5rem 1.25rem' }}>
            Quit Session
          </button>
        )}
      </div>

      {/* Camera calibration pose skeleton */}
      <div className="panel" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '468px'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-left)', fontWeight: 800, letterSpacing: '0.05em' }}>HARDWARE EMULATOR</span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.4rem 0 1rem', letterSpacing: '-0.02em' }}>Camera calibration</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1.5rem', fontWeight: 300 }}>
            In the native app, K Move maps elbow, shoulder and wrist points to the catcher angle. Stand in the webcam frame to sync calibration. Test skeleton below tracks your steer coordinate updates in real-time.
          </p>
          
          {/* Animated calibration skeleton box */}
          <div style={{
            background: '#040508',
            height: '180px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
          }}>
            {calibrationActive ? (
              <div style={{ textAlign: 'center', width: '80%', zIndex: 10 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-left)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                  CALIBRATING DEVICE CAMERA... {calibrationProgress}%
                </span>
                
                <div style={{
                  height: '6px',
                  background: '#0a0c16',
                  borderRadius: '3px',
                  marginTop: '0.5rem',
                  overflow: 'hidden',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{
                    width: `${calibrationProgress}%`,
                    height: '100%',
                    background: 'var(--color-left)',
                    borderRadius: '3px',
                    transition: 'width(0.1s) linear'
                  }}></div>
                </div>
              </div>
            ) : (
              <canvas 
                ref={skeletonCanvasRef}
                width="280"
                height="180"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block'
                }}
              />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button 
            onClick={startCalibration} 
            disabled={calibrationActive}
            className="btn btn-cyan" 
            style={{ flex: 1, padding: '0.6rem 1.2rem', fontSize: '0.9rem', opacity: calibrationActive ? 0.5 : 1 }}
          >
            {calibrationActive ? 'Syncing...' : 'Calibrate Camera'}
          </button>
        </div>
      </div>

    </div>
  );
}

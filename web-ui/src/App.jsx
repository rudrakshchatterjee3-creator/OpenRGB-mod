import React, { useState, useEffect, useRef } from 'react';
import { Settings, Power, Sliders, Palette, RefreshCw, Layers, MonitorPlay, Mic, Save, Trash2, Play, Square } from 'lucide-react';
import './index.css';

function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [ws, setWs] = useState(null);
  const [status, setStatus] = useState('Connecting to Bridge...');
  
  // Navigation State
  const [activePanel, setActivePanel] = useState('devices');

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3001');
    
    socket.onopen = () => {
      setStatus('Connected');
      setWs(socket);
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'DEVICES_LIST') {
        setDevices(msg.payload);
        if (msg.payload.length > 0) {
          setSelectedDevice(prev => prev ? msg.payload.find(d => d.id === prev.id) || msg.payload[0] : msg.payload[0]);
        } else {
            setStatus('No devices found (Is OpenRGB Server running?)');
        }
      }
    };

    socket.onclose = () => {
      setStatus('Disconnected from Bridge');
      setWs(null);
    };

    return () => socket.close();
  }, []);

  const handleModeChange = (mode) => {
    if (!ws || !selectedDevice) return;
    setSelectedDevice({...selectedDevice, activeMode: mode});
    ws.send(JSON.stringify({ type: 'UPDATE_MODE', deviceId: selectedDevice.id, modeName: mode }));
  };

  const handleColorChange = (e) => {
    if (!ws || !selectedDevice) return;
    setSelectedDevice({...selectedDevice, color: e.target.value});
  };

  const applyColor = () => {
    if (!ws || !selectedDevice || !selectedDevice.color) return;
    ws.send(JSON.stringify({ type: 'UPDATE_COLOR', deviceId: selectedDevice.id, color: selectedDevice.color }));
  };

  const handleTurnOffAll = () => {
    if (!ws || devices.length === 0) return;
    devices.forEach(d => {
      ws.send(JSON.stringify({ type: 'UPDATE_COLOR', deviceId: d.id, color: '#000000' }));
    });
  };

  if (!selectedDevice && devices.length === 0) {
      return (
          <div style={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '20px' }}>
              <div className="bg-blobs">
                  <div className="blob blob-1"></div>
                  <div className="blob blob-2"></div>
              </div>
              <h1 style={{fontSize: '48px'}}>OpenRGB Web UI</h1>
              <p style={{fontSize: '20px', color: 'var(--text-muted)'}}>{status}</p>
          </div>
      );
  }

  return (
    <>
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div style={{ padding: '40px', width: '100vw', maxWidth: '1400px', display: 'flex', gap: '30px', height: '100vh', boxSizing: 'border-box' }}>
        
        {/* Sidebar */}
        <div className="glass-panel" style={{ width: '280px', display: 'flex', flexDirection: 'column', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <Palette size={32} color="var(--accent-blue)" />
            <h2>OpenRGB Web</h2>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            <button onClick={() => setActivePanel('devices')} className={`glass-button ${activePanel === 'devices' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start' }}>
              <Layers size={18} /> Devices
            </button>
            <button onClick={() => setActivePanel('ambilight')} className={`glass-button ${activePanel === 'ambilight' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start' }}>
              <MonitorPlay size={18} /> Ambilight
            </button>
            <button onClick={() => setActivePanel('audio')} className={`glass-button ${activePanel === 'audio' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start' }}>
              <Mic size={18} /> Visualizer
            </button>
            <button onClick={() => setActivePanel('snapshots')} className={`glass-button ${activePanel === 'snapshots' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start' }}>
              <Save size={18} /> Profiles
            </button>
          </nav>
          
          <div style={{ marginTop: 'auto' }}>
            <button onClick={() => setActivePanel('settings')} className={`glass-button ${activePanel === 'settings' ? 'active' : ''}`} style={{ width: '100%', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start' }}>
              <Settings size={18} /> Settings
            </button>
            <div style={{marginBottom: '10px', fontSize: '12px', textAlign: 'center', color: ws ? 'var(--accent-blue)' : '#ff6b6b'}}>
              {status}
            </div>
            <button className="glass-button" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => window.location.reload()}>
              <RefreshCw size={16} /> Rescan
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Header */}
          <header className="glass-panel" style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '28px', marginBottom: '4px', textTransform: 'capitalize' }}>
                {activePanel === 'devices' ? 'Dashboard' : activePanel}
              </h1>
              <p style={{ color: 'var(--text-muted)' }}>
                {activePanel === 'devices' && 'Manage your RGB ecosystem'}
                {activePanel === 'ambilight' && 'Sync your screen to your entire room'}
                {activePanel === 'audio' && 'Pulse your lights to the beat of your music'}
                {activePanel === 'snapshots' && 'Save and load your favorite color profiles'}
                {activePanel === 'settings' && 'System Health & Settings'}
              </p>
            </div>
            <button onClick={handleTurnOffAll} className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,50,50,0.2)', border: '1px solid rgba(255,50,50,0.3)', color: '#ff6b6b' }}>
              <Power size={18} /> Turn Off All
            </button>
          </header>

          <div style={{ display: 'flex', gap: '30px', flex: 1, minHeight: 0 }}>
            
            {/* Devices Panel */}
            {activePanel === 'devices' && (
              <>
                <div className="glass-panel" style={{ flex: '1', padding: '24px', overflowY: 'auto' }}>
                  <h3 style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>Connected Devices ({devices.length})</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {devices.map(device => (
                      <div 
                        key={device.id} 
                        onClick={() => setSelectedDevice(device)}
                        style={{ 
                          padding: '16px', borderRadius: '16px', 
                          background: selectedDevice?.id === device.id ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)',
                          border: `1px solid ${selectedDevice?.id === device.id ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)'}`,
                          cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '16px' }}>{device.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{device.type} • {device.activeMode}</div>
                        </div>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: device.color || '#fff', boxShadow: `0 0 10px ${device.color || '#fff'}40` }}></div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedDevice && (
                  <div className="glass-panel" style={{ flex: '2', padding: '30px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                      <div>
                        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>{selectedDevice.name}</h2>
                        <p style={{ color: 'var(--text-muted)' }}>{selectedDevice.type} Device • ID: {selectedDevice.id}</p>
                      </div>
                      <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '14px' }}>
                        {selectedDevice.modes.length} Modes Available
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                      <div>
                        <h4 style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Lighting Mode</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '10px' }}>
                          {selectedDevice.modes.map(mode => (
                            <button 
                              key={mode} 
                              className={`glass-button ${selectedDevice.activeMode === mode ? 'active' : ''}`}
                              onClick={() => handleModeChange(mode)}
                              style={{ textAlign: 'left' }}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Color</h4>
                        <input 
                            type="color" value={selectedDevice.color || '#ffffff'} onChange={handleColorChange}
                            style={{width: '100%', height: '100px', border: 'none', borderRadius: '16px', background: 'transparent', cursor: 'pointer', marginBottom: '24px'}}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                      <button className="glass-button active" onClick={applyColor}>Apply Color</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Ambilight Panel */}
            {activePanel === 'ambilight' && <AmbilightPanel ws={ws} devices={devices} />}
            
            {/* Audio Visualizer Panel */}
            {activePanel === 'audio' && <AudioPanel ws={ws} devices={devices} />}

            {/* Snapshots Panel */}
            {activePanel === 'snapshots' && <SnapshotsPanel ws={ws} devices={devices} />}

            {/* Settings Panel */}
            {activePanel === 'settings' && (
              <div className="glass-panel" style={{ flex: '1', padding: '30px' }}>
                <h2 style={{marginBottom: '20px'}}>System Health</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                    <h4>WebSocket Bridge</h4>
                    <p style={{ color: ws ? '#4cd137' : '#e84118', marginTop: '8px' }}>{ws ? 'Connected' : 'Disconnected'}</p>
                  </div>
                  <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                    <h4>OpenRGB SDK Connection</h4>
                    <p style={{ color: devices.length > 0 ? '#4cd137' : '#e84118', marginTop: '8px' }}>{devices.length > 0 ? `Connected (${devices.length} devices detected)` : 'Searching...'}</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// Web-Exclusive Feature Components
// ------------------------------------------------------------------------------------------------

function AmbilightPanel({ ws, devices }) {
  const [active, setActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  const startAmbilight = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setActive(true);
      
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      intervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current || !ws) return;
        ctx.drawImage(videoRef.current, 0, 0, 10, 10);
        const data = ctx.getImageData(0, 0, 10, 10).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i+1]; b += data[i+2];
        }
        const pixels = data.length / 4;
        r = Math.floor(r / pixels);
        g = Math.floor(g / pixels);
        b = Math.floor(b / pixels);
        
        const hex = '#' + [r,g,b].map(x => {
          const h = x.toString(16);
          return h.length === 1 ? '0'+h : h;
        }).join('');

        devices.forEach(d => {
          ws.send(JSON.stringify({ type: 'UPDATE_COLOR', deviceId: d.id, color: hex }));
        });
      }, 50); // 20 FPS to prevent overwhelming network
      
      stream.getVideoTracks()[0].onended = stopAmbilight;
    } catch (e) {
      console.error(e);
    }
  };

  const stopAmbilight = () => {
    setActive(false);
    clearInterval(intervalRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  };

  useEffect(() => { return stopAmbilight; }, []);

  return (
    <div className="glass-panel" style={{ flex: '1', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <MonitorPlay size={64} color="var(--accent-blue)" style={{ marginBottom: '20px' }} />
      <h2 style={{ marginBottom: '10px' }}>Screen Sync Ambilight</h2>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px', marginBottom: '30px' }}>
        Share your screen to sync the dominant colors across your entire RGB ecosystem in real-time.
      </p>
      
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} width="10" height="10" style={{ display: 'none' }} />

      {active ? (
        <button onClick={stopAmbilight} className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,50,50,0.2)', border: '1px solid rgba(255,50,50,0.3)', color: '#ff6b6b' }}>
          <Square size={20} /> Stop Sync
        </button>
      ) : (
        <button onClick={startAmbilight} className="glass-button active" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Play size={20} /> Start Screen Sync
        </button>
      )}
    </div>
  );
}

function AudioPanel({ ws, devices }) {
  const [active, setActive] = useState(false);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);
  let lastSendTime = 0;

  const startAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      setActive(true);
      processAudio();
    } catch (e) {
      console.error('Audio capture failed. Ensure you allow microphone/stereo mix access.', e);
    }
  };

  const processAudio = () => {
    if (!analyserRef.current || !ws) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Get average bass volume
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += dataArray[i];
    const bass = sum / 10;
    
    const now = performance.now();
    if (now - lastSendTime > 50) { // Limit to 20 FPS
      lastSendTime = now;
      
      // Map bass (0-255) to Hue and Brightness
      const hue = Math.floor((bass / 255) * 360);
      const hex = hslToHex(hue, 100, Math.max(10, (bass / 255) * 100));
      
      devices.forEach(d => {
        ws.send(JSON.stringify({ type: 'UPDATE_COLOR', deviceId: d.id, color: hex }));
      });
    }
    
    animationRef.current = requestAnimationFrame(processAudio);
  };

  const stopAudio = () => {
    setActive(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
  };

  useEffect(() => { return stopAudio; }, []);

  // Helper HSL to Hex
  function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  return (
    <div className="glass-panel" style={{ flex: '1', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Mic size={64} color="var(--accent-blue)" style={{ marginBottom: '20px' }} />
      <h2 style={{ marginBottom: '10px' }}>Audio Visualizer</h2>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px', marginBottom: '30px' }}>
        Pulse your RGB setup to the beat of your music. Please allow microphone access or select 'Stereo Mix' in your OS.
      </p>

      {active ? (
        <button onClick={stopAudio} className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,50,50,0.2)', border: '1px solid rgba(255,50,50,0.3)', color: '#ff6b6b' }}>
          <Square size={20} /> Stop Visualizer
        </button>
      ) : (
        <button onClick={startAudio} className="glass-button active" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Play size={20} /> Start Audio Sync
        </button>
      )}
    </div>
  );
}

function SnapshotsPanel({ ws, devices }) {
  const [profiles, setProfiles] = useState(() => {
    return JSON.parse(localStorage.getItem('rgb_profiles') || '[]');
  });

  const saveProfile = () => {
    const name = prompt('Enter a name for this profile:');
    if (!name) return;
    
    // Save current color of all devices
    const state = devices.map(d => ({ id: d.id, color: d.color, mode: d.activeMode }));
    const newProfiles = [...profiles, { id: Date.now(), name, state }];
    setProfiles(newProfiles);
    localStorage.setItem('rgb_profiles', JSON.stringify(newProfiles));
  };

  const loadProfile = (profile) => {
    profile.state.forEach(deviceState => {
      if (deviceState.mode) {
        ws.send(JSON.stringify({ type: 'UPDATE_MODE', deviceId: deviceState.id, modeName: deviceState.mode }));
      }
      if (deviceState.color) {
        ws.send(JSON.stringify({ type: 'UPDATE_COLOR', deviceId: deviceState.id, color: deviceState.color }));
      }
    });
  };

  const deleteProfile = (id) => {
    const newProfiles = profiles.filter(p => p.id !== id);
    setProfiles(newProfiles);
    localStorage.setItem('rgb_profiles', JSON.stringify(newProfiles));
  };

  return (
    <div className="glass-panel" style={{ flex: '1', padding: '30px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Save size={24} /> Saved Profiles</h2>
        <button onClick={saveProfile} className="glass-button active">Save Current State</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {profiles.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No profiles saved yet.</p>
        ) : (
          profiles.map(p => (
            <div key={p.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '18px' }}>{p.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.state.length} devices</p>
              
              {/* Color swatches preview */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {p.state.slice(0, 5).map((s, i) => (
                  <div key={i} style={{ width: '16px', height: '16px', borderRadius: '50%', background: s.color || '#fff' }}></div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                <button onClick={() => loadProfile(p)} className="glass-button active" style={{ flex: 1, padding: '8px' }}>Load</button>
                <button onClick={() => deleteProfile(p.id)} className="glass-button" style={{ padding: '8px', color: '#ff6b6b' }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;

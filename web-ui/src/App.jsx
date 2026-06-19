import React, { useState, useEffect } from 'react';
import { Settings, Power, Sliders, Palette, RefreshCw, Layers } from 'lucide-react';
import './index.css';

function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [ws, setWs] = useState(null);
  const [status, setStatus] = useState('Connecting to Bridge...');

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
          setSelectedDevice(msg.payload[0]);
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
    
    // Optimistic UI update
    setSelectedDevice({...selectedDevice, activeMode: mode});
    
    ws.send(JSON.stringify({
      type: 'UPDATE_MODE',
      deviceId: selectedDevice.id,
      modeName: mode
    }));
  };

  const handleColorChange = (e) => {
    if (!ws || !selectedDevice) return;
    const color = e.target.value;
    
    // We only update locally, apply button sends it to avoid spamming the hardware
    setSelectedDevice({...selectedDevice, color: color});
  };

  const applyColor = () => {
    if (!ws || !selectedDevice || !selectedDevice.color) return;
    ws.send(JSON.stringify({
      type: 'UPDATE_COLOR',
      deviceId: selectedDevice.id,
      color: selectedDevice.color
    }));
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
            <button className="glass-button active" style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start' }}>
              <Layers size={18} /> Devices
            </button>
            <button className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start' }}>
              <Sliders size={18} /> Effects
            </button>
            <button className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start' }}>
              <Settings size={18} /> Settings
            </button>
          </nav>
          
          <div style={{ marginTop: 'auto' }}>
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
              <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>Dashboard</h1>
              <p style={{ color: 'var(--text-muted)' }}>Manage your RGB ecosystem</p>
            </div>
            <button className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,50,50,0.2)', border: '1px solid rgba(255,50,50,0.3)', color: '#ff6b6b' }}>
              <Power size={18} /> Turn Off All
            </button>
          </header>

          <div style={{ display: 'flex', gap: '30px', flex: 1, minHeight: 0 }}>
            
            {/* Device List */}
            <div className="glass-panel" style={{ flex: '1', padding: '24px', overflowY: 'auto' }}>
              <h3 style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>Connected Devices ({devices.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {devices.map(device => (
                  <div 
                    key={device.id} 
                    onClick={() => setSelectedDevice(device)}
                    style={{ 
                      padding: '16px', 
                      borderRadius: '16px', 
                      background: selectedDevice?.id === device.id ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)',
                      border: `1px solid ${selectedDevice?.id === device.id ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px' }}>{device.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{device.type} • {device.activeMode}</div>
                    </div>
                    {/* Basic color preview - requires real device color parsing for true accuracy */}
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: device.color || '#fff', boxShadow: `0 0 10px ${device.color || '#fff'}40` }}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Details */}
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
                  {/* Mode Selector */}
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

                  {/* Color Controls */}
                  <div>
                    <h4 style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Color</h4>
                    
                    <input 
                        type="color" 
                        value={selectedDevice.color || '#ffffff'} 
                        onChange={handleColorChange}
                        style={{width: '100%', height: '100px', border: 'none', borderRadius: '16px', background: 'transparent', cursor: 'pointer', marginBottom: '24px'}}
                    />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                          <span>Brightness (Coming Soon)</span>
                        </div>
                        <input type="range" min="0" max="100" defaultValue="100" disabled />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                  <button className="glass-button active" onClick={applyColor}>Apply Color to Device</button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;

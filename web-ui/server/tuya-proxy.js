const TuyaDevice = require('tuyapi');
const { Server } = require('e131');
const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');
const http = require('http');
// (Optional OpenRGB SDK - but actually Web UI might connect via Tuya proxy directly to SDK, let's just forward it)
const { Client } = require('openrgb-sdk');

// Start Express Server to serve React UI
const app = express();

let uiBundle = null;
try {
    uiBundle = require('./bundled_ui.json');
} catch(e) {
    console.error('Failed to load UI bundle. Did you run postinstall?');
}

// Fallback for React Router / SPA
app.use((req, res, next) => {
    if (!uiBundle) {
        return res.status(500).send('UI Bundle Not Loaded');
    }
    
    let reqPath = req.path;
    if (reqPath === '/') reqPath = '/index.html';

    // If file exists in bundle, serve it
    if (uiBundle[reqPath]) {
        const file = uiBundle[reqPath];
        res.type(file.mime);
        res.send(Buffer.from(file.data, 'base64'));
    } 
    // Otherwise fallback to index.html for SPA routing
    else if (req.method === 'GET' && req.accepts('html')) {
        const file = uiBundle['/index.html'];
        if (file) {
            res.type(file.mime);
            res.send(Buffer.from(file.data, 'base64'));
        } else {
            res.status(404).send('index.html not found in bundle');
        }
    } else {
        res.status(404).send('Not Found');
    }
});

const httpServer = http.createServer(app);

// Start WebSocket server on same port (3001) for the Web UI to connect
const wss = new WebSocketServer({ port: 3001 });
console.log('[WebSocket] Listening for React UI on port 3001...');

// Connect OpenRGB SDK Client
const sdkClient = new Client('TuyaBridge', 6742, '127.0.0.1');

const connectWithRetry = () => {
    sdkClient.connect().then(() => {
        console.log('[OpenRGB SDK] Connected successfully!');
    }).catch(err => {
        console.log('[OpenRGB SDK] Not available yet, retrying in 2 seconds...', err.message);
        setTimeout(connectWithRetry, 2000);
    });
};
connectWithRetry();

wss.on('connection', (ws) => {
    console.log('[WebSocket] React UI Connected!');
    
    // Fetch and send initial device list if SDK is connected
    const sendDevices = async () => {
        try {
            const numDevices = await sdkClient.getControllerCount();
            const devicesList = [];
            for (let i = 0; i < numDevices; i++) {
                const device = await sdkClient.getControllerData(i);
                
                // Get the actual color of the first LED, fallback to #ffffff
                let deviceColor = '#ffffff';
                if (device.colors && device.colors.length > 0) {
                    const c = device.colors[0];
                    deviceColor = '#' + [c.red, c.green, c.blue].map(x => {
                        const hex = x.toString(16);
                        return hex.length === 1 ? '0' + hex : hex;
                    }).join('');
                }

                devicesList.push({
                    id: i,
                    name: device.name,
                    type: device.type || 'Unknown',
                    color: deviceColor,
                    activeMode: device.activeMode !== undefined && device.modes ? device.modes[device.activeMode].name : 'Direct',
                    modes: device.modes ? device.modes.map(m => m.name) : ['Direct']
                });
            }
            ws.send(JSON.stringify({ type: 'DEVICES_LIST', payload: devicesList }));
        } catch (e) {
            // SDK might not be ready
        }
    };
    sendDevices();
    
    ws.on('message', async (data) => {
        try {
            const msg = JSON.parse(data);
            if (msg.type === 'UPDATE_COLOR') {
                // Convert #RRGGBB to openrgb-sdk color array
                const r = parseInt(msg.color.substr(1,2), 16);
                const g = parseInt(msg.color.substr(3,2), 16);
                const b = parseInt(msg.color.substr(5,2), 16);
                
                // Get device and update all LEDs
                const device = await sdkClient.getControllerData(msg.deviceId);
                const colors = Array(device.leds.length).fill({ red: r, green: g, blue: b });
                await sdkClient.updateLeds(msg.deviceId, colors);
            } else if (msg.type === 'UPDATE_MODE') {
                // Update device mode
                const device = await sdkClient.getControllerData(msg.deviceId);
                const modeIndex = device.modes.findIndex(m => m.name === msg.modeName);
                if (modeIndex !== -1) {
                    await sdkClient.updateMode(msg.deviceId, modeIndex);
                }
            }
        } catch (e) {
            console.error('[WebSocket] Error processing message:', e.message);
        }
    });
});

httpServer.listen(3000, () => {
    console.log('[Express] React UI hosted on http://localhost:3000');
});

// User's Wipro Bulb credentials
const device = new TuyaDevice({
  id: 'd76dd805aa745aa384cyc8',
  key: '~tfCpiSB1k?Vf&H|',
  version: '3.3' // Most modern Wipro bulbs use v3.3
});

let isConnected = false;
let isSending = false;
let lastUpdate = 0;
const RATE_LIMIT_MS = 30; // Increased to 33 FPS for ultra-smooth fan sync

let pendingColor = null;
let streamStarted = false; // Track if we've initialized the stream

// Connect to Tuya Bulb
device.find().then(() => {
  console.log('[Tuya] Bulb found on network!');
  device.connect();
}).catch(err => {
    console.error('[Tuya] Failed to find bulb automatically. Ensure it is on the same Wi-Fi.', err);
});

device.on('connected', () => {
  console.log('[Tuya] Connected to Bulb successfully!');
  isConnected = true;
  streamStarted = false;
});

device.on('disconnected', () => {
  console.log('[Tuya] Disconnected from Bulb.');
  isConnected = false;
  streamStarted = false;
});

device.on('error', error => {
  console.error('[Tuya] Error:', error);
});

// Helper function to convert RGB to HSV (Tuya expects HSV)
function rgbToHsv(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    let d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
        h = 0; // achromatic
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [ Math.round(h * 360), Math.round(s * 1000), Math.round(v * 1000) ];
}

// Format HSV for Tuya v3.3 devices (dps 24 color code)
// Format: HHHHSSSSVVVV in hex
function formatTuyaColorString(h, s, v) {
    const hexH = h.toString(16).padStart(4, '0');
    const hexS = s.toString(16).padStart(4, '0');
    const hexV = v.toString(16).padStart(4, '0');
    return hexH + hexS + hexV;
}

function processPendingPacket() {
    if (isSending || !pendingColor) return;
    
    const now = Date.now();
    if (now - lastUpdate < RATE_LIMIT_MS) {
        // Wait until the rate limit allows us to send again
        setTimeout(processPendingPacket, RATE_LIMIT_MS - (now - lastUpdate));
        return;
    }
    
    // Lock and pop the color
    isSending = true;
    lastUpdate = Date.now();
    const colorStr = pendingColor;
    pendingColor = null;

    // Send full payload on first frame to ensure it's ON and in COLOUR mode.
    // Afterwards, ONLY send the colour data to minimize TCP payload latency!
    const payload = streamStarted ? { '24': colorStr } : { '20': true, '21': 'colour', '24': colorStr };
    
    device.set({
        multiple: true,
        data: payload
    }).then(() => {
        isSending = false;
        streamStarted = true;
        // Check if a new frame piled up while we were sending!
        processPendingPacket();
    }).catch(err => {
        isSending = false;
        processPendingPacket();
    });
}

// Start E1.31 (sACN) Server
const e131Server = new Server(5568);
console.log('[E1.31] Listening for OpenRGB packets on port 5568...');

e131Server.on('packet', (packet) => {
    if (!isConnected) return;
    
    const slotsData = packet.getSlotsData();
    const r = slotsData[0];
    const g = slotsData[1];
    const b = slotsData[2];

    const [h, s, v] = rgbToHsv(r, g, b);
    
    // Always overwrite with the absolute newest requested color
    pendingColor = formatTuyaColorString(h, s, v);
    
    // Trigger the queue processor
    processPendingPacket();
});

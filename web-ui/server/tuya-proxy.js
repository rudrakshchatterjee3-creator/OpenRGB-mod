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
app.use(express.static(path.join(__dirname, '../dist')));

const httpServer = http.createServer(app);

// Start WebSocket server on same port (3001) for the Web UI to connect
const wss = new WebSocketServer({ port: 3001 });
console.log('[WebSocket] Listening for React UI on port 3001...');

// Connect OpenRGB SDK Client
const sdkClient = new Client('TuyaBridge', 6742, '127.0.0.1');

sdkClient.connect().then(() => {
    console.log('[OpenRGB SDK] Connected successfully!');
}).catch(err => {
    console.log('[OpenRGB SDK] Not available (OpenRGB might still be starting)', err.message);
});

wss.on('connection', (ws) => {
    console.log('[WebSocket] React UI Connected!');
    
    // Fetch and send initial device list if SDK is connected
    const sendDevices = async () => {
        try {
            const numDevices = await sdkClient.getControllerCount();
            const devicesList = [];
            for (let i = 0; i < numDevices; i++) {
                const device = await sdkClient.getControllerData(i);
                devicesList.push({
                    id: i,
                    name: device.name,
                    color: '#ffffff', // default UI state
                    activeMode: 'Direct'
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
const RATE_LIMIT_MS = 100; // Tweaked for faster response

let pendingColor = null;

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
});

device.on('disconnected', () => {
  console.log('[Tuya] Disconnected from Bulb.');
  isConnected = false;
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

    device.set({
        multiple: true,
        data: {
            '21': 'colour',
            '24': colorStr
        }
    }).then(() => {
        isSending = false;
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

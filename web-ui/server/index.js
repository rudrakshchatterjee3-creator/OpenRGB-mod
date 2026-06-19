const { WebSocketServer } = require('ws');
const { Client } = require('openrgb-sdk');

const wss = new WebSocketServer({ port: 3001 });
let client = null;

async function initOpenRGB() {
    try {
        client = new Client('WebUI-Bridge', 6742, 'localhost');
        await client.connect();
        console.log('Connected to OpenRGB core server');
        
        const controllerCount = await client.getControllerCount();
        console.log(`Found ${controllerCount} devices`);
    } catch (e) {
        console.error('Failed to connect to OpenRGB. Is it running?', e.message);
    }
}

initOpenRGB();

wss.on('connection', async (ws) => {
    console.log('WebUI Frontend connected via WebSocket');
    
    // Send initial device state if connected
    if (client) {
        try {
            const count = await client.getControllerCount();
            let devices = [];
            for(let i=0; i<count; i++) {
                let dev = await client.getDeviceController(i);
                devices.push({
                    id: i,
                    name: dev.name,
                    type: dev.type,
                    modes: dev.modes.map(m => m.name),
                    activeMode: dev.modes[dev.activeMode]?.name || 'Unknown',
                    colors: dev.colors,
                    leds: dev.leds
                });
            }
            ws.send(JSON.stringify({ type: 'DEVICES_LIST', payload: devices }));
        } catch (e) {
            console.error('Error fetching devices', e);
        }
    }

    ws.on('message', async (data) => {
        try {
            const msg = JSON.parse(data);
            if (msg.type === 'UPDATE_MODE' && client) {
                // Not perfectly robust, but works for the MVP
                let dev = await client.getDeviceController(msg.deviceId);
                let modeIndex = dev.modes.findIndex(m => m.name === msg.modeName);
                if(modeIndex !== -1) {
                    await client.updateMode(msg.deviceId, modeIndex);
                    console.log(`Updated device ${msg.deviceId} to mode ${msg.modeName}`);
                }
            } else if (msg.type === 'UPDATE_COLOR' && client) {
                // Update all LEDs to the specified hex color (assuming #RRGGBB)
                const hex = msg.color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                
                let dev = await client.getDeviceController(msg.deviceId);
                let colors = Array(dev.colors.length).fill({ red: r, green: g, blue: b });
                await client.updateLeds(msg.deviceId, colors);
                console.log(`Updated device ${msg.deviceId} color to ${msg.color}`);
            }
        } catch (e) {
            console.error('Error processing websocket message', e);
        }
    });
});

console.log('WebSocket bridge running on ws://localhost:3001');

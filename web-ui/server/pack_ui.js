const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist');
const bundlePath = path.join(__dirname, 'bundled_ui.json');

const bundle = {};

function walk(dir, prefix = '') {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath, prefix + file + '/');
        } else {
            const content = fs.readFileSync(filePath);
            const mimeType = file.endsWith('.html') ? 'text/html' :
                             file.endsWith('.js') ? 'application/javascript' :
                             file.endsWith('.css') ? 'text/css' :
                             file.endsWith('.svg') ? 'image/svg+xml' :
                             'application/octet-stream';
            
            bundle['/' + prefix + file] = {
                mime: mimeType,
                data: content.toString('base64')
            };
        }
    }
}

try {
    walk(distPath);
    // Also map root / to /index.html
    if (bundle['/index.html']) {
        bundle['/'] = bundle['/index.html'];
    }
    fs.writeFileSync(bundlePath, JSON.stringify(bundle));
    console.log('Successfully bundled React UI into JSON');
} catch(e) {
    console.error('Failed to bundle React UI', e);
}

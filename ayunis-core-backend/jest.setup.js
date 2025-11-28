// Fix for Node.js 25+ compatibility with buffer-equal-constant-time and jsonwebtoken
// See: https://github.com/auth0/node-jsonwebtoken/issues/947

// Patch Buffer globally before any modules import it
const { Buffer } = require('buffer');

// Ensure SlowBuffer is available (removed in Node.js 14+)
if (!Buffer.SlowBuffer) {
  Buffer.SlowBuffer = Buffer;
}

// Make SlowBuffer available globally for buffer-equal-constant-time
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

// Ensure buffer module exports SlowBuffer
const bufferModule = require('buffer');
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = Buffer;
}

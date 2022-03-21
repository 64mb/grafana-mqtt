const { spawn, spawnSync } = require('child_process')

spawnSync('npm i --package-lock=false', {
  stdio: 'inherit',
  shell: true,
})

// install dependencies every time package.json changes
const npmProcess = spawn('nodemon --on-change-only --polling-interval 10000 -L -w package.json --exec "npm i --package-lock=false"', {
  stdio: 'inherit',
  shell: true,
})

// restart node when a source file changes, plus
// restart when `npm install` after `package.json` changing
const appProcess = spawn('nodemon --polling-interval 2000 -L --inspect -e js,json server.js', {
  stdio: 'inherit',
  shell: true,
})

process.on('SIGTERM', async () => {
  npmProcess.kill('SIGTERM')
  appProcess.kill('SIGTERM')
})

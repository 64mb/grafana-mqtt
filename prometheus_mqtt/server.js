const prometheus = require('./prometheus')
const mqtt = require('./mqtt')

const promServer = prometheus.init()
const mqttServer = mqtt.init()

process.on('SIGTERM', async () => {
  await promServer.close()
  await mqttServer.close()
})

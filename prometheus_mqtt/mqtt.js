const prometheus = require('prom-client')
const aedes = require('aedes')
const net = require('net')
const http = require('http')
const ws = require('websocket-stream')
const logger = require('./logger')

function ipFormat(seed) {
  let ip = null
  if (seed == null) {
    return ip
  }
  ip = seed.toString()

  try {
    ip = ip.split(':')
    ip = ip[ip.length - 1]
  } catch (err) {
    ip = null
  }
  return ip
}

async function mqttAuth(client, username, password, callback) {
  if (username == null) {
    return callback(new Error('auth mqtt error'), null)
  }

  const ip = ipFormat(client.conn.remoteAddress)

  if (password != null) {
    password = password.toString()
  }

  if (
    password === process.env.MQTT_SERVER_PASSWORD
  ) {
    client.auth = true
    client.username = username
    client.ip = ip
  }

  if (!client.auth) {
    return callback(new Error('auth mqtt error'), null)
  }

  logger.info({
    msg: 'auth mqtt success',
    ip,
    id: client.id,
    username: client.username,
  })

  return callback(null, true)
}

const storage = {}

function setMetric(name, value, label = null) {
  if (storage[name] == null) {
    storage[name] = {
      default: 0,
      store: {},
      metric: new prometheus.Gauge({
        name,
        help: 'mqtt metric',
        labelNames: ['scope'],
        async collect() {
          if (storage[name] == null) {
            return
          }

          const seeds = Object.values(storage[name].store)
          seeds.forEach((seed) => {
            try {
              if (Date.now() - seed.time < 60000) {
                this.set({ ...seed.label }, +seed.value)
              } else {
                this.set({ ...seed.label }, storage[name].default)
              }
            } catch (err) {
              logger.error({
                msg: 'error set metric in collect', metric: name, seed, error: err.stack || err,
              })
            }
          })
        },
      }),
    }
  }

  if (value == null) {
    value = storage[name].default
  }

  const seed = {
    value,
    label: {},
  }

  let key = '_'
  if (label != null) {
    key = Object.entries(label).map(([k, v]) => {
      seed.label[k.toString()] = v.toString()
      return `${k}_${v}`
    }).join('$')
  }
  seed.time = Date.now()

  storage[name].store[key] = seed
}

function mqttAuthPublish(client, pub, callback) {
  if (!client.auth) {
    return callback(new Error('pub mqtt error'))
  }

  const topic = pub.topic
  const scope = client.username

  let payload = pub.payload
  try {
    payload = parseFloat(payload.toString())
  } catch (err) {
    payload = null
  }
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(payload)) {
    payload = null
  }

  setMetric(topic, payload, { scope })

  logger.info({
    msg: 'pub mqtt success',
    ip: client.ip,
    id: client.id,
    username: client.username,
    topic,
    payload,
  })
  return callback(null)
}

function mqttAuthSubscribe(client, sub, callback) {
  if (!client.auth) {
    return callback(new Error('sub mqtt error'))
  }

  logger.info({
    msg: 'sub mqtt success',
    ip: client.ip,
    id: client.id,
    username: client.username,
    topic: sub.topic,
  })
  return callback(null, sub)
}

const server = {
  tcp: null,
  ws: null,
  aedes: null,
}

async function init() {
  const portTcp = process.env.MQTT_SERVER_PORT || 1883
  const portWebsocket = process.env.MQTT_SERVER_WS_PORT || 1884

  const config = {}

  const serverAedes = aedes(config)
  serverAedes.authenticate = mqttAuth
  serverAedes.authorizePublish = mqttAuthPublish
  serverAedes.authorizeSubscribe = mqttAuthSubscribe
  server.aedes = serverAedes

  const serverTCP = net.createServer(serverAedes.handle)
  server.tcp = serverTCP

  const serverWebSocket = http.createServer()
  ws.createServer({ server: serverWebSocket }, serverAedes.handle)
  server.ws = serverWebSocket

  const promiseTCP = new Promise((resolve, reject) => {
    serverTCP.on('error', (err) => {
      logger.error({ msg: 'error mqtt server listen tcp', error: err.stack || err, port: portTcp })
      reject(err)
    })
    serverTCP.listen(portTcp, () => {
      logger.info({ msg: 'mqtt tcp server started on port', port: portTcp })
      resolve(true)
    })
  })

  const promiseWebSocket = new Promise((resolve, reject) => {
    serverWebSocket.on('error', (err) => {
      logger.error({ msg: 'error mqtt server listen websocket', error: err.stack || err, port: portWebsocket })
      reject(err)
    })
    serverWebSocket.listen(portWebsocket, () => {
      logger.info({ msg: 'mqtt websocket server started on port', port: portWebsocket })
      resolve(true)
    })
  })

  await Promise.all([promiseTCP, promiseWebSocket])
}

async function close() {
  const promiseTCP = new Promise((resolve, reject) => {
    server.tcp.close((err) => {
      if (err != null) reject(err)
      resolve(true)
    })
  })

  const promiseWebSocket = new Promise((resolve, reject) => {
    server.ws.close((err) => {
      if (err != null) reject(err)
      resolve(true)
    })
  })

  const promiseAedes = new Promise((resolve, reject) => {
    server.aedes.close((err) => {
      if (err != null) reject(err)
      resolve(true)
    })
  })

  await Promise.all([promiseTCP, promiseWebSocket])
  await promiseAedes
}

module.exports = {
  init,
  close,
}

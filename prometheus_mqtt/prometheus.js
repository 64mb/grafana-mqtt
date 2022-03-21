const prometheus = require('prom-client')
const fastify = require('fastify')
const logger = require('./logger')

function init() {
  const server = fastify({
    logger: false,
  })

  // const helper = require('./helper')

  // helper.init()

  server.get('/', async () => {
    const metrics = await prometheus.register.metrics()
    return metrics
  })

  server.listen(6464, '0.0.0.0', (err, address) => {
    if (err) {
      logger.error({ msg: 'error prometheus client init', error: err.stack || err })
      process.exit(1)
    }
    logger.info(`prometheus client listening on ${address}`)
  })

  return server
}
module.exports = {
  init,
}

const pino = require('pino')

const logger = pino({
  formatters: {
    // eslint-disable-next-line no-unused-vars
    level(label, number) {
      return { level: label }
    },
  },
})

module.exports = logger

const { createProbot } = require('probot')
const app = require('./')
const isBase64 = require('is-base64')

require('dotenv').config()

const probot = createProbot({
  id: process.env.APP_ID,
  secret: process.env.WEBHOOK_SECRET,
  cert: isBase64(process.env.PRIVATE_KEY)
    ? Buffer.from(process.env.PRIVATE_KEY, 'base64').toString()
    : process.env.PRIVATE_KEY
})

probot.setup([app])

module.exports = probot.webhook.middleware

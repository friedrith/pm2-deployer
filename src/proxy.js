import express from 'express'
import httpProxy from 'http-proxy'
import bodyParser from 'body-parser'

import winston from 'winston'

export default class Proxy {
  constructor (config) {
    this.config = config
    this.app = express()
    this.proxy = httpProxy.createProxyServer({ ws: true })


    this.app.use(bodyParser.json()) // support json encoded bodies
    this.app.use(bodyParser.urlencoded({ extended: true })) // support encoded bodies

    this.app.use((req, res, next) => {
        winston.info('search app')
        for (let app of config.apps) {
          if (req.headers.host === app.url) {
            var target = 'http://127.0.0.1:' + app.env.PORT
            req._target = target
            this.proxy.web(req, res, { target: target, xfwd: true }, (err) => {
              if (err) {
                winston.error('error in proxy', { error: err })
              }
            })
            return
          }
        }
        next()
    })


    this.app.get('/', (req, res, next) => {
        res.send('Hello World')
    })

    this.server = this.app.listen(process.env.PORT_PROXY, '0.0.0.0', () => { //start web server
      winston.info(`proxy listening on port ${this.server.address().port}`)
    }).on('error', (err) => {
      winston.error('error listen', { error: err })
    })

    this.server.on('upgrade', (req, socket, head) => {

        for (var app of config.apps) {
          if (req.headers.host === app.url) {
            var target = 'ws://127.0.0.1:' + app.env.PORT
            req._target = target
            this.proxy.ws(req, socket, head, { target: target, xfwd: true }, (err) => {
              winston.error('error in proxy ws', { error: err })
            })

            return
          }
        }
    })
  }
}

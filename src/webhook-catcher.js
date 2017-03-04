import express from 'express'
import EventEmitter from 'events'
import winston from 'winston'
import bodyParser from 'body-parser'
import crypto from 'crypto'
import morgan from 'morgan'

export default class WebhookCatcher extends EventEmitter {
  constructor (config) {
    super()
    this.app = express()

    this.app.use(morgan('combined'))
    this.app.use(bodyParser.json())
    this.app.use(bodyParser.urlencoded({ extended: true })) // support encoded bodies

    this.app.post('/webhook/bitbucket/:token/:appName', (req, res) => {
      res.send('ok')

      //
      // let branch = req.body.push.changes[0].new.name
      //
      // console.log(req.body.push.changes, req.body.push.changes[0], req.body.push.changes[0].new, branch)


      if (req.params.token === config.bitbucket.token && req.body.push && req.body.push.changes && req.body.push.changes.length > 0 && req.body.push.changes[0].new.type === 'branch') {

        let branch = req.body.push.changes[0].new.name

        for (let app of config.apps) {
          // console.log(app)
          if (app.name === req.params.appName && branch === app.branch) {
            this.emit('webhook', { app:app, from: 'bitbucket' })
          }
        }
      }
    })

    this.app.post('/webhook/github/:appName', (req, res) => {

      winston.info('webhook github')
      let repository = req.params.repository
      let event = req.headers['x-github-event']
      let signature = req.headers['x-hub-signature']

      if (!req.body.ref) {
        res.sendStatus(200)
        return
      }
      winston.info('webhook github 2')


      let branch = req.body.ref.split('/')[2]
      let hmac = crypto.createHmac('sha1', config.github.token)

      hmac.update(JSON.stringify(req.body))

      if ('sha1=' + hmac.digest('hex') !== signature) {
        res.status(404).send('bad signature')
        return
      }

      winston.info('webhook github 3')


      if (event !== 'push') {
        res.status(404).send('bad event')
        return
      }

      winston.info('webhook github 4')


      if (repository === 'pm2-deployer') {
        res.sendStatus(200)
        return
      }

      winston.info('webhook github 5')


      for (let app of config.apps) {
        // console.log(app)

        winston.info('webhook github 6', { app: app.name })

        if (app.name === req.params.appName && branch === app.branch) {
          this.emit('webhook', { app: app, from: 'github' })
        }
      }

      winston.info('webhook github 7')

      res.send('ok')
    })

    this.app.use('*', (req, res) => {
      res.sendStatus(404)
    })

    this.server = this.app.listen(process.env.PORT, '127.0.0.1', () => {
      winston.info(`webhook catcher listening on port ${this.server.address().port}`)
    })

  }
}

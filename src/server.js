import winston from 'winston'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
// import pm2 from 'pm2'
import git from 'simple-git'
import { exec } from 'child_process'

import WebhookCatcher from 'webhook-catcher'
import express from 'express'

import StadaloneProxy from './proxy/standalone'
import NginxProxy from './proxy/nginx'
// import WebhookCatcher from './webhook-catcher'

import DefaultNotifier from './notifiers/default'
import SlackNotifier from './notifiers/slack'

if (process.env.NODE_ENV !== 'production') {
  try {
    dotenv.config()
  } catch (err) {
    winston.error(err)
    process.exit(2)
  }
}

let config = null

try {
  config = yaml.safeLoad(fs.readFileSync(__dirname + '/../config.yaml', 'utf8'))
} catch (err) {
  winston.error(err)
  process.exit(2)
}

// console.log(config)

let notifier = null
if (config.notifiers.slack) {
  notifier = new SlackNotifier(config.notifiers.slack)
} else {
  notifier = new DefaultNotifier()
}

if ('true' === process.env.PROXY || 'standalone' === process.env.PROXY) {
  new StadaloneProxy(config)
} else if ('nginx' === process.env.PROXY) {
  winston.info('setup config nginx')
  const proxy = new NginxProxy(config, path.resolve(__dirname, '../examples/nginx-default.conf'))
  proxy.generateConfig(path.resolve(__dirname, '../', process.env.NGINX_CONFIG_PATH))
} else {
  winston.info('no proxy')
}

const app = express()

const catcher = new WebhookCatcher({
  services: [ 'bitbucket', 'github' ],
  token: config.accounts.token,
})

app
.use('/webhook', catcher.router)
.get('/', (req, res) => {
    res.send('ok')
})
.use('*', (req, res) => {
  res.sendStatus(404)
})

const server = app.listen(process.env.PORT, '127.0.0.1', () => {
  winston.info(`webhook catcher listening on port ${server.address().port}`)
})

// let catcher = new WebhookCatcher(config)

catcher.on('push', ({ appName, branch, service }) => {

  let app = null

  for (let currentApp of config.apps) {
    if (appName === currentApp.name && branch === currentApp.branch) {
      app = currentApp
    }
  }

  if (app === null) {
    winston.error(`impossible to redeploy app ${app.name}, app not found in configuration file`)
    notifier.error(app)
    return
  }

  winston.info('reploy', appName)

  let repositoryPath = path.join(__dirname, '../', config.root_directory, app.path ? app.path : app.name)

  let repository = git(repositoryPath)

  let raw = []
  if (service === 'bitbucket' && config.accounts.bitbucket && config.accounts.bitbucket.ssh_key) {
    raw = [
        'config',
        '--local',
        'core.sshCommand',
        '/usr/bin/ssh -i ' + path.join(__dirname, '../', config.accounts.bitbucket.ssh_key)
    ]
  }

  repository
  .raw(raw)
  // .fetch()
  // .checkout(app.branch, (err) => {
  .pull((err) => {
    if (err) {
      notifier.error(app)
      winston.error(err)
    } else {
      exec('cd ' + repositoryPath + ' && npm install && npm run build && pm2 restart ' + app.name, (error, stdout, stderr) => {
        if (error) {
          winston.error(err, stdout, stderr)
          notifier.error(app)
        } else {
          /*pm2.connect((err) => {
            if (err) {
              winston.log('error', err)
              process.exit(2)
            }

            pm2.start({
              name: app.name
            }, (err, apps) => {
              pm2.disconnect()
              if (err) {
                winston.log('error', err)
              } else {
                winston.info('app ' + app.name + ' reployed')
              }
            })
          })*/
          notifier.success(app)
          winston.info('app ' + app.name + ' reployed')
        }
      })
    }
  })

  // console.log('git pull')
  // console.log('npm install')
  // console.log('pm2 restart')
})

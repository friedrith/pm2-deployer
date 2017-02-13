import winston from 'winston'
import dotenv from 'dotenv'
import fs from 'fs'
// import path from 'path'
import yaml from 'js-yaml'
// import pm2 from 'pm2'

import WebhookCatcher from './webhook-catcher'


if (process.env.NODE_ENV !== 'production') {
  try {
    dotenv.config()
  } catch (err) {
    winston.log('error', err)
    process.exit(2)
  }
}

let config = null

try {
  config = yaml.safeLoad(fs.readFileSync(__dirname + '/../config.yaml', 'utf8'))
} catch (err) {
  winston.log('error', err)
  process.exit(2)
}

console.log(config)

let catcher = new WebhookCatcher(config)

catcher.on('webhook', ({ app }) => {
  winston.info('reploy', app.name)

  let path = path.join(__dirname, config.base, app.path ? app.path : app.name)

  console.log('git pull')
  console.log('npm install')
  console.log('pm2 restart')
  /*
  pm2.connect((err) => {
    if (err) {
      winston.log('error', err)
      process.exit(2)
    }

    pm2.start({
      script: app.script
    }, (err, apps) => {
      pm2.disconnect()
      if (err) {
        winston.log('error', err)
      } else {*/
        winston.info(`app ${app.name} reployed`)
      /*}
    })
  })*/



})

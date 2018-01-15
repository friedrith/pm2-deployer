import winston from 'winston'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import git from 'simple-git'
import { exec } from 'child_process'

import SlackNotifier from './notifiers/slack'

let config = null

try {
  config = yaml.safeLoad(fs.readFileSync(__dirname + '/../config.yaml', 'utf8'))
} catch (err) {
  winston.error(err)
  process.exit(2)
}

const initGit = (repositoryPath, url) => {

  const repository = git(path.join(__dirname, '../'))

  return new Promise((resolve, reject) => {

    fs.access(repositoryPath, fs.R_OK, (err) => {
      if (err) {
        let raw = []
        if (url.match(/bitbucket\.org/) && config.bitbucket && config.bitbucket.ssh_key) {
          raw = [
               'config',
               '--local',
               'core.sshCommand',
               '/usr/bin/ssh -i ' + path.join(__dirname, '../', config.bitbucket.ssh_key)
           ]
        }
        repository
        .raw(raw)
        .clone(url, repositoryPath, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  })
}

const build = (repositoryPath, app) => {
  return new Promise((resolve, reject) => {
    exec('cd ' + repositoryPath + ' && npm install && npm run build && pm2 restart ' + app.name, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

const notifier = new SlackNotifier(config)

for (const app of config.apps) {
  if (app.name !== 'pm2-deployer') {
    let repositoryPath = path.join(__dirname, '../', config.base, app.path ? app.path : app.name)
    winston.info('app detected', { name: app.name, path: repositoryPath, url: app.url })
    initGit(repositoryPath, app.repo).catch((e) => {
      winston.info('error during cloning app', { name: app.name, error: e })
      throw 'error'
    }).then(() => {
      winston.info('app cloned', { name: app.name })
      return build(repositoryPath, app).catch((e) => {
        winston.info('error during building app', { name: app.name, error: e })
        throw 'error'
      })
    }).then(() => {
      winston.info('app built', { name: app.name })
    }).catch(() => {
      process.exit(2)
    })
  }
}

import winston from 'winston'
import path from 'path'
import fs from 'fs'

export default class Nginx {
  constructor (config, templatePath) {
    this.config = config
    this.templatePath = templatePath
  }

  findTemplate () {
    return new Promise((resolve, reject) => {
      fs.readFile(this.templatePath, 'utf8', (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })

  }

  generateConfig (nginxConfigPath) {
    this.findTemplate()
    .catch((err) => {
      winston.error('impossible to find template', { error: err })
    })
    .then((template) => {

      const siteEnabledPath = path.resolve(nginxConfigPath, 'sites-enabled')
      const siteAvailablePath = path.resolve(nginxConfigPath, 'sites-available')

      // remove all site enabled
      fs.readdir(siteEnabledPath, (err, files) => {
        // console.log('files', files)
        files.forEach(file => {
          if (file !== 'default') {
            winston.info('removing file', { file: path.resolve(siteEnabledPath, file) })
            fs.unlinkSync(path.resolve(siteEnabledPath, file))
          }
        })
      })

      winston.info('symlinks removed')


      // remove all site available
      fs.readdir(siteAvailablePath, (err, files) => {
        // console.log('files', files)
        files.forEach(file => {
          if (file !== 'default') {
            winston.info('removing file', { file: path.resolve(siteEnabledPath, file) })
            fs.unlinkSync(path.resolve(siteAvailablePath, file))
          }
        })
      })

      winston.info('available removed')


      this.config.apps.forEach(app => {
        if (app.env.PORT && app.url) {
          const filename = app.url.replace(/\./g, '-')
          const file_name = app.url.replace(/\./g, '_')
          const content =
            template
            .replace(/\{\% upstream \%}/g, file_name)
            .replace(/\{\% port \%}/g, app.env.PORT)
            .replace(/\{\% domain \%}/g, app.url)
            .replace(/\{\% www_domain \%}/g, `www.${app.url}`)
            .replace(/\{\% log \%}/g, filename)
            .replace(/\{\% http \%}/g, file_name)

          var absoluteFilename = path.resolve(siteAvailablePath, filename)
          fs.writeFileSync(absoluteFilename, content)
          fs.symlinkSync(absoluteFilename, path.resolve(siteEnabledPath, filename))
        }
      })
    }).catch((error) => {
      winston.error('error while updating nginx configuration', { error })
    })
  }

}

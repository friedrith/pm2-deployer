import Slack from 'node-slack'

export default class SlackNotifier {
  constructor (config) {
    this.config = config
    this.slack = new Slack(config.hook_url)
  }

  success (app) {
    if (!this.slack) {
      return
    }
    this.slack.send({
        text: 'Application ' + app.name + ' has been sucessfully deployed. It is available at url ' + app.url,
        channel: this.config.channel,
        username: this.config.name
    })
  }

  error (app) {
    if (!this.slack) {
      return
    }
    this.slack.send({
        text: 'Error during deploying application ' + app.name,
        channel: this.config.channel,
        username: this.config.name
    })
  }


}

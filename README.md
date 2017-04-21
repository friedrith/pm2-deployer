# pm2-deployer

It is a tool to easily deploy web applications managed by pm2 and hosted on github or bitbucket catching webhooks.

With **pm2-deployer**:
* redeploy automatically web applications after push on bitbucket or github repositories
* [optionnal] use several web application on the same server thanks to a proxy integrated in **pm2-deployer**

## Get started

```bash
$ git clone https://github.com/thibaultfriedrich/pm2-deployer.git
$ cd pm2-deployer
$ cp examples/config.yaml config.yaml

# update the file config.yaml in order to define all apps

cd ../

# for all apps
$ git clone <repository>
$ cd <repository path>
$ npm install && npm run build
$ cd ../


# finally
$ cd pm2-deployer
$ npm install && npm run build
$ pm2 start config.yaml # start all applications
```


## Configuration

A example of the config file is [here](examples/config.yaml). This file is also used by pm2 to manage the web applications. So you only need one config file for **pm2** and **pm2-deployer**.

### Base

We encourage you to get this web application folders architecture :

```
+ pm2-deployer
  > config.yaml
  > package.json
  > ...
+ web app 1 # directly cloned from your repository
+ web app 2
+ web app 3
```

In this configuration, your config.yaml should begin like that:
```yaml
base: ../
```

### Github

If your web applications are hosted on github, you may want to catchs the pushes on your git to automatically redeploy your app after the pushes. So you have to define a token in the config.yaml.

```yaml
github:
  token: <your token> # on linux, you can use command echo $(date)$(uname -a) | md5sum to generate a token
```

Then on your github repository, go to Settings > Webhooks > Add webhook and use the following configuration :

* Payload URL: `<host to your pm2-deployer>/webhook/github/<web app 1>`
* Content type: `application/json`
* Secret: <your token>

> For now, this configuration expects that your github repository is fully public.

### Bitbucket

If your web applications are hosted on bitbucket, you may want to catch events on your git to automatically redeploy your app after the pushes. So you have to define a token in the config.yaml.

Exactly as github, you can specify a token in the config.yaml. Besides, you can also specify a ssh key to access the repository

```yaml
bitbucket:
  token: <your token>
  ssh_key: <path to a rsa private key relatively to the config.yaml path>
```

Then on your bitbucket repository, go to Settings > Webhooks > Add webhook and use the following configuration:

* Title: whatever you want
* URL: `<host to your pm2-deployer>/webhook/bitbucket/<web app 1>/<token>`
* Status: checked
* SSL/TLS: checked if your pm2-deployer is accessible with https
* trigger: Repository Push

If your bitbucket repository is private, you need to define a ssh key to be enabled to pull and get the new version of your web application.

Generate the ssh key in the server hosting **pm2-deployer** with command `ssh-keygen -N "" -f ssh_rsa` (you need to use empty passphrase). Then add the public key in the bitbucket repository as access keys : got to Settings > Access keys > Add key.


> At the opposite of github, it works for private repositories on bitbucket

### Slack

You may be notified if deployment succeeded or failed on slack.

On slack, go to App & integrations > Build > Start Building.

Choose a name and the team then go to Incoming Webhooks > On > Add a New Webhook to Team.

Finally choose your channel then click on Authorize.


On **pm2-deployer**, use the following configuration:

```yaml
slack
  hook_url: <hook_url>
  name: <the notifications will be send with this name>
  channel: <the channel previously chosen>
```


### apps

Then you need to set the configuration of your web applications:

```yaml
apps:
  # for each app
  -name: <web app1> # the same name used in the webhook, and used as the folder name of the application
  repo: <url of the repository> # not used for now
  branch: <branch name> # the branch we detect the pushes
  script: <the path to your node.js script entrance>
  url: <the web application 1 is accessible through this url> # for the slack notification
  env: # defines the environment variables needed by the web application 1
    PORT: <port> # the port of your web application
    NODE_ENV: production # etc
    # ...
```

**pm2-deployer** is used to detect pushes on repositories but as **pm2-deployer** has access to a lot of information, **pm2-deployer** may be also used as a proxy for all your web application managed by pm2 and **pm2-deployer**.

You might use nginx as proxy for web application for significant traffic but **pm2-deployer** proxy is easier to use for small traffic because you need only one config file to manage pm2, deployment and proxy.

In order to do it, you only need to add environment variables to your **pm2-deployer** :

* PORT_PROXY: <port accessible from outside
* PROXY: 'true'

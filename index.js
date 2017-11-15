const cp = require('child_process')
const path = require('path')
const fs = require('fs')
const log4js = require('log4js')
const logger = log4js.getLogger()
const chalk = require('chalk')
const freeShadowsocks = require('free-shadowsocks')

log4js.configure({
  appenders: {
    everything: {type: 'file', filename: 'ss.log'},
  },
  categories: {
    default: {appenders: ['everything'], level: 'debug'},
  },
})

const configPath = path.join(__dirname, 'config.json')

const log = console.log

function readConfig() {
  return new Promise(resolve => {
    log(chalk.green('start read config.json'))
    fs.readFile(configPath, (err, data) => {
      if (err) {
        reject(err)
        return
      }
      resolve(JSON.parse(data))
    })
  })
}

function writeConfig() {
  log(chalk.green('start read from ishadowx'))
  return freeShadowsocks().then(servers => {
    // use second server
    const server = servers[1]
    log(chalk.cyan('user server config', server))
    return readConfig().then(config => {
      Object.assign(config, server)
      return new Promise((resolve, reject) => {
        log(chalk.cyan('start write config.json'))
        fs.writeFile(configPath, JSON.stringify(config, null, 2), err => {
          if (err) {
            reject(err)
          }
          resolve()
        })
      })
    })
  })
}

// sslocal process
let ss
function run() {
  writeConfig()
    .then(() => {
      log(chalk.green('starting sslocal'))
      ss = cp.spawn('sslocal', ['-c', configPath])
      ss.stderr.on('data', err => {
        logger.error(String(err))
      })
    })
    .catch(err => {
      log(chalk.red(err))
      logger.debug(String(err))
    })

  // 3 hours restart
  setTimeout(() => {
    ss.kill()
    run()
  }, 1000 * 60 * 60 * 3)
}

function killss() {
  if (ss) {
    ss.kill()
  }
  process.exit()
}

process.on('SIGINT', killss)
process.on('exit', killss)
process.on('SIGUSER1', killss)
process.on('uncaughtException', killss)

run()

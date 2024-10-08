#!/usr/bin/env node
const { semver, error } = require('@vue/cli-shared-utils')
const requiredVersion = require('../package.json').engines.node
const filterPluginsByPlatform = require('../utils/filterPlugins')
const { LogUpdate } = require('@mpxjs/vue-cli-plugin-mpx/utils/reporter')
const Service = require('../lib/Service')
const {
  getTargets,
  setTargetProcessEnv,
  runServiceCommand,
  removeArgv,
  rawTarget
} = require('@mpxjs/cli-shared-utils')

if (
  !semver.satisfies(process.version, requiredVersion, {
    includePrerelease: true
  })
) {
  error(
    `You are using Node ${process.version}, but mpx-cli-service ` +
      `requires Node ${requiredVersion}.\nPlease upgrade your Node version.`
  )
  process.exit(1)
}

const service = new Service(process.env.VUE_CLI_CONTEXT || process.cwd())
const rawArgv = process.argv.slice(2)
const args = require('minimist')(rawArgv, {
  boolean: [
    // build
    'modern',
    'report',
    'report-json',
    'inline-vue',
    'watch',
    // serve
    'open',
    'copy',
    'https',
    // inspect
    'verbose'
  ]
})
const targets = getTargets(args)
if (targets.length === 1) {
  const command = args._[0]
  const target = targets[0]
  setTargetProcessEnv(target)
  const setPluginsToSkip = service.setPluginsToSkip.bind(service)
  service.setPluginsToSkip = function (args) {
    setPluginsToSkip(args, rawArgv)
    let plugins = filterPluginsByPlatform(process.env.MPX_CLI_MODE)
    // 小程序模式下，将 @vue/cli-service 内置的 base 及 app 配置过滤掉
    if (process.env.MPX_CLI_MODE !== 'web') {
      plugins = plugins.concat([
        'built-in:config/base',
        'built-in:config/app',
        'built-in:config/css'
      ])
    }
    plugins.forEach((plugin) => {
      this.pluginsToSkip.add(plugin)
    })
  }
  if (target.env) args.mode = target.env
  service.run(command, args, rawArgv).catch((err) => {
    error(err)
    process.exit(1)
  })
} else {
  const chunks = []
  let doneNum = 0
  const num = 0
  const logUpdate = new LogUpdate()
  targets.forEach((target, index) => {
    const ls = runServiceCommand(
      [...removeArgv(rawArgv, 'targets'), '--targets', rawTarget(target)],
      {
        env: {
          ...process.env,
          FORCE_COLOR: true,
          NODE_ENV: undefined
        },
        stdio: 'inherit'
      }
    )
    // 子进程输出内容
    ls.on('message', (data) => {
      if (data.status === 'done') {
        doneNum++
        if (doneNum === num) {
          doneNum = 0
          logUpdate.done()
        }
      } else {
        chunks[index] = data.message
        logUpdate.render(chunks.join('\n\n'))
      }
    })
    ls.on('exit', (exitCode) => {
      if (exitCode !== 0) process.exitCode = exitCode
    })
  })
}

const MpxWebpackPlugin = require('@mpxjs/webpack-plugin')
const WebpackBar = require('webpackbar')
const { transformMpxEntry } = require('../transformMpxEntry')
const {
  resolveMpxWebpackPluginConf
} = require('../resolveMpxWebpackPluginConf')
const { resolveMpxLoader } = require('../../utils/resolveMpxLoader')
const { getReporter } = require('../../utils/reporter')
const { getWebpackName } = require('../../utils/name')
const { getCurrentTarget } = require('@mpxjs/cli-shared-utils/lib')

function changeStyleVueRuleToMpx (webpackConfig, name) {
  const store = webpackConfig.module.rule(name).oneOfs.store
  const value = store.get('vue')
  value.name = 'mpx'
  value.names = [name, 'mpx']
  store.delete('vue')
  store.set('mpx', value)
}

module.exports.resolveWebWebpackConfig = function resolveWebWebpackConfig (
  api,
  options = {},
  webpackConfig
) {
  const target = getCurrentTarget()
  transformMpxEntry(api, options, webpackConfig, true)
  try {
    changeStyleVueRuleToMpx(webpackConfig, 'css')
    changeStyleVueRuleToMpx(webpackConfig, 'stylus')
    changeStyleVueRuleToMpx(webpackConfig, 'sass')
    changeStyleVueRuleToMpx(webpackConfig, 'less')
    changeStyleVueRuleToMpx(webpackConfig, 'scss')
    changeStyleVueRuleToMpx(webpackConfig, 'postcss')
  } catch (error) {}
  const mpxLoader = resolveMpxLoader(api, options)
  webpackConfig.plugins.delete('friendly-errors')
  webpackConfig.module
    .rule('mpx')
    .test(/\.mpx$/)
    .use('vue-loader')
    .loader(require.resolve('@vue/vue-loader-v15'))
    .end()
    .use('mpx-loader')
    .loader(require.resolve(mpxLoader.loader))
    .options(mpxLoader.options)

  // 直接更新 vue-cli-service 内部的 vue-loader options 配置
  webpackConfig.module
    .rule('vue')
    .use('vue-loader')
    .tap((options) =>
      Object.assign(options, {
        transformAssetUrls: {
          'mpx-image': 'src',
          'mpx-audio': 'src',
          'mpx-video': 'src'
        }
      })
    )

  // 对于 svg 交给 mpx-url-loader 处理，去掉 vue-cli 配置的 svg 规则
  webpackConfig.module.rules.delete('svg')

  const pluginConfig = {
    mode: 'web',
    srcMode: 'wx',
    forceDisableBuiltInLoader: true,
    ...resolveMpxWebpackPluginConf(api, options)
  }

  webpackConfig
    .plugin('mpx-webpack-plugin')
    .use(MpxWebpackPlugin, [pluginConfig])

  const name = getWebpackName(api, target, pluginConfig)

  webpackConfig.name(name)

  // fancy reporter
  webpackConfig.plugin('webpackbar').use(WebpackBar, [
    {
      color: 'orange',
      name: name,
      basic: false,
      reporter: getReporter()
    }
  ])
}

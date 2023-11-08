const MpxWebpackPlugin = require('@mpxjs/webpack-plugin')
const {
  transformMpxEntry,
  resolveMpxLoader,
  resolveMpxWebpackPluginConf
} = require('@mpxjs/vue-cli-plugin-mpx')
const minimist = require('minimist')

module.exports = function (api, options = {}) {
  api.chainWebpack((webpackConfig) => {
    transformMpxEntry(api, options, webpackConfig, true)

    const mpxLoader = resolveMpxLoader(api, options)
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

    const parsedArgs = minimist(process.argv.slice(2))

    webpackConfig.plugin('mpx-webpack-plugin').use(MpxWebpackPlugin, [
      {
        mode: 'web',
        srcMode: 'wx',
        env: parsedArgs.env,
        forceDisableBuiltInLoader: true,
        ...resolveMpxWebpackPluginConf(api, options)
      }
    ])
  })
}

const isDev = think.env === 'development';

module.exports = [{
  immediate: !isDev,
  cron: '0 * * * *',
  async handle () {
    const taobao = think.service('taobao')
    await taobao.sync()
  }
}]
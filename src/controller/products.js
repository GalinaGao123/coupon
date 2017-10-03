const Base = require('./base.js')
const microApp = think.config('microApp')

module.exports = class extends Base {
  async indexAction() {
    const products = this.mongo('products')
    const category = this.ctx.param('category')
    const order = this.ctx.param('order') || 'itemId desc'
    const q = this.ctx.param('q')

    if (category) { products.where({ category }) }
    if (q) { products.where({ title: { $regex: decodeURIComponent(q) } }) }

    const items = await products.page(this.ctx.param('page'))
                                .order(order)
                                .countSelect({}, true)
    
    this.success(items)
  }

  async refreshAction() {
    await this.service('taobao').sync()
    this.success({success: true})
  }

  async getAction() {
    const products = this.mongo('products')
    const id = this.ctx.param('id')
    const detail = await products.where({itemId: parseInt(id)}).find()

    this.success({detail, stageMode: microApp.stageMode})
  }

  async createTokenAction() {
    const products = this.mongo('products')
    const id = this.ctx.param('id')
    const item = await products.where({itemId: parseInt(id)}).find()

    if (!item) { return this.fail(1, '淘口令生成失败') }
    if (item.model) { return this.success(item.model) }

    const model = await this.service('taobao').createToken(item.couponUrl, item.picture)

    await products.where({itemId: parseInt(id)}).update({ model })

    this.success(model)
  }
};
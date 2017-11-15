const tbConfig = think.config('taobao')
const qs = require('querystring')
const moment = require('moment')
const _ = require('lodash')
const crypto = require('crypto')

module.exports = class extends think.Service {
  run (method, params = {}) {
    return this.fetch(tbConfig.endPoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: qs.stringify(this.sign(method, params))
    }).then(res => res.json())
  }

  sign (method, params) {
    const fullParams = {
      ...params,
      app_key: tbConfig.appKey,
      method,
      sign_method: 'md5',
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
      format: 'json',
      v: '2.0',
      simplify: true
    }

    const bundleParams = _.map(fullParams, (v, k) => `${k}${v}`).sort().join('')
    const sign = crypto.createHash('md5')
                       .update(`${tbConfig.appSecret}${bundleParams}${tbConfig.appSecret}`)
                       .digest('hex')
                       .toUpperCase()
    
    return { ...fullParams, sign }
  }

  async getFavorites () {
    let page = 1
    const favorites = []

    while (true) {
      const json = await this.run('taobao.tbk.uatm.favorites.get', {
        page_no: page,
        page_size: 20,
        fields: 'favorites_title,favorites_id,type'
      })

      json.results.forEach(item => favorites.push(item))
      page += 1

      if (favorites.length >= json.total_results) { return favorites }
    }
  }

  async getItems (favorites) {
    let page = 1
    const items = []

    while (true) {
      const json = await this.run('taobao.tbk.uatm.favorites.item.get', {
        page_no: page,
        page_size: 20,
        platform: 1,
        adzone_id: tbConfig.adZone,
        unid: 'combo',
        favorites_id: favorites.favorites_id,
        fields: 'num_iid,title,pict_url,small_images,zk_final_price,provcity,volume,shop_title,status,coupon_click_url,coupon_info'
      })

      json.results.forEach(item => items.push(item))

      page += 1
      if (items.length >= json.total_results) { 
        return items.filter(item => item.status === 1 && item.coupon_info && this.convertCoupon(item.coupon_info))
                    .map(item => ({
                      itemId: item.num_iid,
                      title: item.title,
                      picture: item.pict_url,
                      smallImages: item.small_images,
                      price: parseFloat(item.zk_final_price),
                      city: item.provcity,
                      salesCount: item.volume,
                      shop: item.shop_title,
                      couponUrl: item.coupon_click_url,
                      couponPrice: parseInt(this.convertCoupon(item.coupon_info)),
                      category: favorites.favorites_title
                    }))
      }
    }
  }

  async createToken (url, picture) {
    const json = await this.run('taobao.tbk.tpwd.create', {
      text: '优惠券已经准备好，请小主点击查看',
      url: url,
      logo: picture
    })

    return json.data.model
  }

  async sync () {
    think.logger.info('------------------- 开始同步淘宝数据 -------------------')
    const products = think.mongo('products')
    await products.delete()

    const favorites = await this.getFavorites()

    for (let i = 0; i < favorites.length; i++) {
      const items = await this.getItems(favorites[i])
      await products.addMany(items)
    }
  }

  convertCoupon (info) {
    const price = info.match(/\d+/g)
    return price && price.length && price[price.length - 1]
  }
}

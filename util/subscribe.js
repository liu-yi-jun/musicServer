let request = require('request');
let accessToken = require('./access_token')
const InfoId = require('../config/config').InfoId;
const db = require('../db/db');
module.exports = {
  sendSubscribeInfo ({ otherId, template_id, data, page = 'pages/home/home' }) {
    return new Promise(async (reslove, reject) => {
      let access_token = await accessToken.getAccessToken()
      let url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${access_token}`
      let onlyQueryResult = await db.onlyQuery('users', 'id', otherId, ['openid'])
      console.log(2222, data);
      request.post({
        url,
        body: {
          touser: onlyQueryResult[0].openid,
          template_id,
          "page": page,
          "data": data
          // template_id: '55CXx2SjqgaZd_fInIsfAY5e16D6SDNYe1fAr-F2tzU',
          // "data": {
          //   "name1": {
          //     "value": "liuyijun"
          //   },
          //   "date2": {
          //     "value": "2015年01月05日"
          //   },
          //   "thing7": {
          //     "value": "TIT创意园"
          //   },
          //   "thing8": {
          //     "value": "广州市新港中路397号"
          //   }
          // }
        },
        json: true
      }, (err, response, body) => {
        console.log(err, 2222222222);
        console.log(body);
        if (err) return reject(err)
        return reslove(body)
      })
    })

  },
  InfoId: InfoId
}
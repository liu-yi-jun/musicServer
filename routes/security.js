var express = require('express');
var router = express.Router();
let accessToken = require('../util/access_token')
let request = require('request');
// 识别所有post请求
router.post('*', async (req, res, next) => {
    if (req.url.includes('upload') || req.url.includes('Store') || req.url.includes('Like') || req.url.includes('share')) {
        return next()
    }
    let access_token = await accessToken.getAccessToken()
    let url = `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${access_token}`
    let body = req.body
    let str = ''
    for (i in body) {
        console.log(body[i], 111111);
        str = str + body[i]
    }
    request.post({
        url,
        body: {
            content: str
        },
        json: true
    }, (err, response, body) => {
        if (err) return next(err)
        if (body.errcode) {
            next(`内容含有违法违规内容`)
        } else {
            next()
        }
    })
})

module.exports = router;
var express = require('express');
var router = express.Router();
let accessToken = require('../util/access_token')
let handleToken = require('../util/handleToken')
const my_crypto = require('../util/my_crypto')
let request = require('request');
// 识别所有post请求
router.post('*', async (req, res, next) => {
  if (!req.url.includes('sendComment') && !req.url.includes('sendReply') && !req.url.includes('squarePost') &&  !req.url.includes('pictureIssue')) {
  // if (req.url.includes('upload') || req.url.includes('Store') || req.url.includes('Like') || req.url.includes('share')) {
    return next()
  }
  let access_token = await accessToken.getAccessToken()
  let url = `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${access_token}`
  let body = req.body
  let str = ''
  for (i in body) {
    str = str + body[i]
  }
  if (!str) return next() 
  let info = await handleToken.verifyToken(req.headers.token)
  info.openid = my_crypto.aesDecrypt(info.openid)
  console.log(str, 1111);
  function msg_sec_check(scene,content) {
    return new Promise((reolve,reject)=> {
      request.post({
        url,
        json: true,
        headers: {
          "content-type": "application/json",
        },
        body: {
          openid: info.openid,
          scene: scene,
          version: 2,
          content: content
        },
        json: true
      }, (err, response, body) => {
        if (err) return reject(err)
        if (body.result.label != 100) {
          reject(`内容含有违法违规内容`)
        } else {
          reolve()
        }
      })
    })
  }
  try {
    await msg_sec_check(1,str)
    // await msg_sec_check(2,str)
    await msg_sec_check(3,str)
    next()
  }catch(err) {
    next(`内容含有违法违规内容`)
  }
  
  // request.post({
  //   url,
  //   body: {
  //     version: 1,
  //     content: str
  //   },
  //   json: true
  // }, (err, response, body) => {
  //   if (err) return next(err)
  //   if (body.errcode) {
  //     next(`内容含有违法违规内容`)
  //   } else {
  //     next()
  //   }
  // })
})

module.exports = router;
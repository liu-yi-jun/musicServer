
let wx = require('../config/config').wx
let request = require('request');
var db = require('../db/db');

let access_token = 0
let createtime = 0
const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${wx.appId}&secret=${wx.appSecret}`

const reqAccessToken = () => {
  return new Promise((resolve, reject) => {
    request(url, (err, response, body) => {
      if (err) return reject(err)
      resolve(body)
    })
  })

}


const updateAccessToken = async () => {
  const resStr = await reqAccessToken()//发送请求
  const res = JSON.parse(resStr)
  if (res.access_token) {
    console.log('写入', res.access_token);
    db.update('access', { access_token: res.access_token }, { id: 1 })
    //写入
    access_token = res.access_token
    createtime = new Date().getTime()
  } else {
    console.log('请求', res.access_token);
    await updateAccessToken()
  }
}

const getAccessToken = () => {

  let sql = `select access_token from access where id = 1`
  return new Promise(async (resolve, reject) => {
    db.coreQuery(sql).then((result) => {
      console.log('获取', result[0].access_token);
      return resolve(result[0].access_token)
    })
  })
}
const start = () => {
  updateAccessToken().then(() => {
    setInterval(() => {
      console.log('获取新的');
      updateAccessToken()
    }, (7200 - 500) * 1000)
  })

}


module.exports = {
  start,
  getAccessToken
}
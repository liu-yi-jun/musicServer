
let wx = require('../config/config').wx
let request = require('request');

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
        //写入
        access_token = res.access_token
        createtime = new Date().getTime()
    } else {
        await updateAccessToken()
    }
}

const getAccessToken = () => {
    return new Promise(async (resolve, reject) => {

        try {
            if (access_token) {
                const nowTime = new Date().getTime()
                if ((nowTime - createtime) / 1000 / 60 / 60 >= 2) {
                    await updateAccessToken()
                    return resolve(access_token)
                }
                return resolve(access_token)
            } else {
                await updateAccessToken()
                return resolve(access_token)
            }

        } catch (error) {
            reject(error)
        }
    })
}
const start = () => {
    updateAccessToken()
    setInterval(async () => {
        await updateAccessToken()
    }, (7200 - 300) * 1000)
}


module.exports = {
    start,
    getAccessToken
}
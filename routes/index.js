
const e = require('express');
var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')
const subscribe = require('../util/subscribe');
let my_crypto = require('../util/my_crypto')
let accessToken = require('../util/access_token')
let request = require('request');

const schedule = require('node-schedule');
// (async function () {
//   //每晚上点定时执行一次:
//   schedule.scheduleJob('0 0 20 * * *', async () => {
//     let access_token = await accessToken.getAccessToken()
//     let url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${access_token}`
//     // let onlyQueryResult = await db.onlyQuery('users', 'isSignIn', 0, ['openid'])
//     let sql = 'select openid from users where isSignIn = 0'
//     let onlyQueryResult = await db.coreQuery(sql)
//     onlyQueryResult.forEach(item => {
//       item.openid = my_crypto.aesDecrypt(item.openid)
//       request.post({
//         url,
//         body: {
//           touser: item.openid,
//           template_id: subscribe.InfoId.signIn,
//           "page": 'pages/square/square',
//           "data": {
//             "thing1": {
//               "value": '连续签到7天获赠精美周边',
//             },
//             "thing2": {
//               "value": '累计打卡30天更有音乐键盘、尤克里里赠送',
//             }
//           },
//           "miniprogramState": 'formal'
//         },
//         json: true
//       }, (err, response, body) => {
//         console.log(err);
//         console.log(body);
//       })
//     })
//   });
// })()

router.post('/share', (req, res, next) => {
  let { table, id, otherId, themeTitle } = req.body
  // subscribe.sendSubscribeInfo({
  //   otherId,
  //   template_id: subscribe.InfoId.forward,
  //   page:'pages/home/home',
  //   "data": {
  //     "thing1": {
  //       "value": util.cutstr(themeTitle, 16)
  //     },
  //     "time2": {
  //       "value": util.format(Date.now())
  //     }
  //   }
  // })
  db.selfInOrDe(table, 'share', 'id', id, true).then(result => res.json(util.success(result))).catch(err => next(err))
})
router.get('/allTopic', (req, res, next) => {
  let sql = 'select * FROM topic'
  db.coreQuery(sql).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.get('/getNotice', (req, res, next) => {
  let userId = req.query.userId
  db.multipleQuery('notice', { otherId: userId, isNew: 1 }).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.get('/myRelease', async (req, res, next) => {
  let { pageSize, pageIndex, userId } = req.query
  try {
    pageSize = Math.ceil(pageSize / 3)
    let sql1 = `SELECT id,title, userId,groupName,existArr,recruitArr,introduce,releaseTime from band where userId = ${userId} LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let sql2 = `SELECT id, userId,title,pictureUrls,groupId,activityTime,organization ,groupName, nickName,avatarUrl,releaseTime from alliance where userId = ${userId} LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let sql3 = `SELECT * FROM second where userId = ${userId} LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`

    let bands = await db.coreQuery(sql1)
    let alliances = await db.coreQuery(sql2)
    let seconds = await db.coreQuery(sql3)
    alliances.forEach(item => {
      item.pictureUrls = JSON.parse(item.pictureUrls)
      item.type = 1
    })
    bands.forEach(item => {
      item.existArr = JSON.parse(item.existArr)
      item.recruitArr = JSON.parse(item.recruitArr)
      item.type = 2
    })

    seconds.forEach(item => {
      item.pictureUrls = JSON.parse(item.pictureUrls)
      item.additional = util.cutstr(item.additional, 50)
      item.type = 3
    })

    Promise.all([bands, alliances, seconds]).then((result) => {
      let data = result[0].concat(result[1]).concat(result[2])
      data.sort((a, b) => {
        return b.releaseTime - a.releaseTime
      })
      return res.json(util.success(data))
    })
  } catch (err) {
    next(err)
  }
})
router.post('/feedback', async (req, res, next) => {
  let params = req.body
  try {
    params.type = 0
    params.date = new Date().getTime()
    db.insert('feedback', params).then(result => res.json(util.success(result))).catch(err => next(err))
  } catch (err) {
    next(err)
  }
})
router.post('/report', async (req, res, next) => {
  let params = req.body
  params.type = 1
  params.date = new Date().getTime()
  try {
    db.insert('feedback', params).then(result => res.json(util.success(result))).catch(err => next(err))
  } catch (err) {
    next(err)
  }
})

router.get('/signInInfo', async (req, res, next) => {
  try {
    let userId = req.query.userId
    let result = await db.onlyQuery('signin', 'userId', userId)
    console.log(result);
    if (!result[0]) {
      db.insert('signin', { userId, continuity: 0, everyday: 1 })
      result[0] = { userId, continuity: 0, everyday: 1 }
    }
    res.json(util.success(result[0]))
  } catch (err) {
    next(err)
  }
})

router.post('/closeEveryday', async (req, res, next) => {
  let userId = req.body.userId
  try {
    let result = await db.update('signin', { everyday: 0 }, { userId })
    res.json(util.success(result))
  } catch (err) {
    next(err)
  }
})


router.post('/signInPost', async (req, res, next) => {
  let userId = req.body.userId
  try {
    let result = await db.onlyQuery('signin', 'userId', userId)
    let queryResult = await db.onlyQuery('users', 'id', userId, ['isSignIn', 'signInSum'])
    let isSignIn = queryResult[0].isSignIn
    let signInInfo = result[0]
    if (isSignIn) {
      return res.json(util.success(result[0]))
    }
    let showSeven = false
    let nowTime = new Date(util.format(new Date().getTime())).getTime()
    if (signInInfo.lastTime) {
      // 后面签到
      console.log(nowTime, signInInfo.lastTime, nowTime - signInInfo.lastTime);
      if (nowTime - signInInfo.lastTime > 24 * 3600 * 1000) {
        console.log('归零');
        // 归零
        signInInfo.situation = JSON.parse(signInInfo.situation)
        if (!signInInfo.situation) {
          let situation = [signInInfo.continuity]
          signInInfo.situation = JSON.stringify(situation)
        } else {
          signInInfo.situation.push(signInInfo.continuity)
          signInInfo.situation = JSON.stringify(signInInfo.situation)
        }
        signInInfo.continuity = 1
      } else {
        console.log('加1');
        // 加1 
        signInInfo.continuity++
        if (signInInfo.continuity === 7 && signInInfo.seven === 0) {
          showSeven = true
          signInInfo.seven = 1
        }
      }
    } else {
      // 第一次签到
      signInInfo.continuity++
    }
    db.selfInOrDe('users', 'signInSum', 'id', userId, true)
    db.update('users', { isSignIn: 1 }, { id: userId })
    signInInfo.lastTime = nowTime
    await db.update('signin', signInInfo, { userId })
    result = await db.onlyQuery('signin', 'userId', userId)
    result[0].showSeven = showSeven
    result[0].signInSum = queryResult[0].signInSum + 1
    res.json(util.success(result[0]))
  } catch (err) {
    next(err)
  }
})


router.post('/codeCheck', async (req, res, next) => {
  let code = req.body.code
  try {
    if (code.length === 6) {
      let flag = false
      let code_index = 0
      global.codes.forEach((item, index) => {
        if (item === code) {
          code_index = index
          flag = true
          return
        }
      })
      if (flag) {
        global.codes.splice(code_index, 1, 0)
        return res.json(util.success(1))
      } else {
        return res.json(util.success(0))
      }
    } else if (code.length === 8) {
      let result = await db.onlyQuery('invitation', 'code', code)
      if (result.length) {
        return res.json(util.success(1))
      } else {
        return res.json(util.success(0))
      }
    } else {
      return res.json(util.success(0))
    }

  } catch (err) {
    next(err)
  }
})


router.post('/sendSystemMsg', async (req, res, next) => {
  let { messageId, msgContent, userId } = req.body
  try {
    msgContent = JSON.stringify(msgContent)
    result = await db.insert('newsystem', { messageId, msgContent, userId })
    return res.json(util.success(result))
  } catch (err) {
    next(err)
  }
})

router.post('/deleteSystemMsg', async (req, res, next) => {
  let { messageId, userId } = req.body
  try {
    result = await db.deleteData('newsystem', { messageId, userId })
    return res.json(util.success(result))
  } catch (err) {
    next(err)
  }
})

router.get('/getSystemMsg', async (req, res, next) => {
  let userId = req.query.userId
  try {
    let sql = `select * from newsystem where userId = ${userId} ORDER BY id DESC`
    let result = await db.coreQuery(sql)
    let msgList = []
    result.forEach(item => {
      item.msgContent = JSON.parse(item.msgContent)
      item.msgContent.message.jsonDate.isNew = 0
      msgList.push(item.msgContent)
    })
    return res.json(util.success(msgList))
  } catch (err) {
    next(err)
  }
})



router.post('/sendFinalSystemMsg', async (req, res, next) => {
  let { from, to, message } = req.body
  try {
    to.userIdList.forEach(async item => {
      let insertDate = {
        userId: from.userId,
        otherId: item.userId,
        type: message.type,
        groupId: message.jsonDate.groupId,
        status: message.jsonDate.status,
        jsonDate: JSON.stringify(message.jsonDate),
        msgId: message.id,
        isNew: 1
      }
      await db.insert('finalsystem', insertDate)
    })
    return res.json(util.success('ok'))
  } catch (err) {
    next(err)
  }
})






module.exports = router;
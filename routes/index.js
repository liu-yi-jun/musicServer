
const e = require('express');
var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.post('/share', (req, res, next) => {
  let { table, id } = req.body
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
    let queryResult = await db.onlyQuery('users', 'id', userId, ['isSignIn',''])
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



module.exports = router;
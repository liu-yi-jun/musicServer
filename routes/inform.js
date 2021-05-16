var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')
let request = require('request');
let accessToken = require('../util/access_token')
let handleToken = require('../util/handleToken')

router.get('/getInform', async (req, res, next) => {
  let { pageSize, pageIndex, userId } = req.query
  try {
    // let informs = await db.paging('notice', pageSize, pageIndex, { otherId: userId }, ['id DESC'])
    let sql = `SELECT t1.id ,t1.userId ,t1.otherId ,t1.theme ,t1.themeId ,t1.themeTitle ,t1.isNew ,t1.type ,t1.content ,t1.commentId,t1.replyId ,t2.nickName,t2.avatarUrl from (select * from notice where otherId=${userId})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let informs = await db.coreQuery(sql)
    let p1 = isLike(informs, userId)
    let p2 = isStore(informs, userId)
    Promise.all([p1, p2]).then((result) => {
      res.json(util.success(result[0]))
    })
  } catch (err) {
    next(err)
  }
})

function isLike (arr, userId) {
  return new Promise((resolve, reject) => {
    if (!arr.length) resolve([])
    let p = Promise.resolve()
    arr.forEach((element, index) => {
      p = p.then(() => {
        if (element.theme === 'groupdynamics') {
          return db.multipleQuery('groupdynamiclike', { 'groupDynamicId': element.themeId, userId })
        } else if (element.theme === 'squaredynamics') {
          return db.multipleQuery('squaredynamicslike', { 'squaredynamicsId': element.themeId, userId })
        }
        return Promise.resolve()
      }).then(result => {
        result && result.length ? element.isLike = true : element.isLike = false
        if (index == arr.length - 1) {
          resolve(arr)
        }
        return
      })
    })
  })
}

function isStore (arr, userId) {
  return new Promise((resolve, reject) => {
    if (!arr.length) resolve([])
    let p = Promise.resolve()
    arr.forEach((element, index) => {
      p = p.then(() => {
        if (element.theme === 'groupdynamics') {
          return db.multipleQuery('groupdynamicstore', { 'groupDynamicId': element.themeId, userId })
        } else if (element.theme === 'squaredynamics') {
          return db.multipleQuery('squaredynamicslike', { 'squaredynamicsId': element.themeId, userId })
        }
        return Promise.resolve()
      }).then(result => {
        result && result.length ? element.isLike = true : element.isLike = false
        if (index == arr.length - 1) {
          resolve(arr)
        }
        return
      })
    })
  })
}

router.post('/modifyInform', async (req, res, next) => {
  let { id } = req.body
  db.update('notice', { isNew: 0 }, { id }).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))
})

router.get('/noticeNumbe', async (req, res, next) => {
  let { userId } = req.query
  try {
    let sql = `select COUNT(*) noticeNumbe from notice where otherId = ${userId} and isNew = 1`
    let result = await db.coreQuery(sql)
    res.json(util.success(result[0]))
  } catch (err) {
    next(err)
  }
})

router.post('/sendSubscribeInfo', async (req, res, next) => {
  let access_token = await accessToken.getAccessToken()
  let url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${access_token}`
  let { userIdList, otherId, template_id, page = 'pages/home/home', data } = req.body
  console.log(2222, data);
  if (!userIdList) {
    let onlyQueryResult = await db.onlyQuery('users', 'id', otherId, ['openid'])

    request.post({
      url,
      body: {
        touser: onlyQueryResult[0].openid,
        template_id,
        "page": page,
        "data": data
      },
      json: true
    }, (err, response, body) => {
      console.log(err);
      console.log(body);
    })
  } else {
    userIdList.forEach((async item => {
      let onlyQueryResult = await db.onlyQuery('users', 'id', item.userId, ['openid'])
      request.post({
        url,
        body: {
          touser: onlyQueryResult[0].openid,
          template_id,
          "page": page,
          "data": data
        },
        json: true
      }, (err, response, body) => {
        console.log(err);
        console.log(body);
      })
    }))
  }
  res.json(util.success('完成'))
})



module.exports = router;
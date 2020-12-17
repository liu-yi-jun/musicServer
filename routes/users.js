var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')
let request = require('request');
let wx = require('../config/config').wx
let handleToken = require('../util/handleToken')


router.get('/getToken', (req, res, next) => {
  let code = req.query.code
  let sessionUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${wx.appId}&secret=${wx.appSecret}&js_code=${code}&grant_type=authorization_code`
  request(sessionUrl, async (err, response, body) => {
    let data = JSON.parse(body);
    console.log(data)
    if (data.errmsg) return res.json(util.fail(data.errmsg))
    try {
      let token = handleToken.createToken({
        openid: data.openid,
        session_key: data.session_key
      })
      res.json(util.success(token))
    } catch (err) {
      next(err)
    }
  })
})

router.get('/getServerUserInfo', (req, res, next) => {
  try {
    handleToken.verifyToken(req.headers.token).then(async info => {
      console.log(1111111111111111, res)
      let openid = info.openid
      let result = await queryUser(openid)
      return res.json(util.success(result))
    })
  } catch (err) {
    next(err)
  }
})


/**
 * @param { number } code
 * @param { number } openid
 * 
 * @res openid，userInfo(如果没有返回空)
 */
router.get('/login', async (req, res, next) => {
  let code = req.query.code;
  let openid = req.query.openid;
  console.log('code=', code)
  console.log('openid=', openid)

  if (openid) {
    try {
      let result = await queryUser(openid)
      res.json(util.success(result))
    } catch (err) {
      next(err)
    }
    return
  }
  if (code) {
    let sessionUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${wx.appId}&secret=${wx.appSecret}&js_code=${code}&grant_type=authorization_code`
    request(sessionUrl, async (err, response, body) => {
      let data = JSON.parse(body);
      if (data.errmsg) return res.json(util.fail(data.errmsg))
      try {
        let result = await queryUser(data.openid)
        res.json(util.success(result))
      } catch (err) {
        next(err)
      }
    })
    return
  }

});
function queryUser(openid) {
  return new Promise((resolve, reject) => {
    console.log('openid=', openid)
    if (!openid) return reject('无法获取openid')
    let sql = 'SELECT * FROM users WHERE openid = ?'
    let params = [openid]
    db.commonQuery(sql, params, (err, result) => {
      if (err) return reject(err)
      console.log('queryUser', result)
      if (result.length) {
        let userInfo = result[0]
        return resolve({ userInfo })
      } else {
        return resolve({})
      }
    })

  })
}

router.post('/register', async (req, res, next) => {
  console.log('111111111111111111111111111111111111111')
  try {
    handleToken.verifyToken(req.headers.token).then(async info => {
      let openid = info.openid
      let userInfo = req.body.userInfo
      let result = await queryUser(openid)
      if (!result.userInfo) {
        await insertUser(openid, userInfo)
        result = await queryUser(openid)
      }
      return res.json(util.success(result))
    })
  } catch (err) {
    next(err)
  }
})
function insertUser(openid, userInfo) {
  return new Promise((resolve, reject) => {
    if (!userInfo) return reject('无法获取用户初始数据')
    let { nickName, gender, avatarUrl } = userInfo
    let sql = "INSERT INTO users (nickName, avatarUrl, gender,openid) VALUES(?, ?, ?, ?); "
    let params = [nickName, avatarUrl, gender, openid]
    db.commonQuery(sql, params, (err, result) => {
      console.log('insertUser', err, result)
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })

  })
}

router.post('/changeBgWall', (req, res, next) => {
  let { userId, bgWall } = req.body
  let modifys = {
    bgWall
  }, conditions = {
    id: userId
  }
  db.update('users', modifys, conditions).then(result => res.json(util.success(result))).catch(err => next(err))
})
router.post('/updateUserInfo', async (req, res, next) => {
  console.log(req.body)
  let { nickName, age, constellation, resume, userId, avatarUrl, gender } = req.body
  try {
    let modifys = {
      nickName,
      age,
      constellation,
      resume,
      avatarUrl,
      gender
    }, conditions = {
      id: userId
    }
    let updateResult = await db.update('users', modifys, conditions)
    let onlyQueryResult = await db.onlyQuery('users', 'id', userId)
    console.log(updateResult)
    res.send(util.success(onlyQueryResult[0]))
  } catch (err) {
    next(err)
  }
})
router.get('/groupAdmini', (req, res, next) => {
  // 用户id
  let groupId = req.query.groupId
  let sql = `select * from users where (groupDuty=0 or groupDuty=1) and groupId = ${groupId}`
  db.coreQuery(sql).then(queryResult => res.json(util.success(queryResult))).catch(err => next(err))

})
router.get('/groupMember', (req, res, next) => {
  let groupId = req.query.groupId
  let sql = `select * from users where groupDuty=2 and groupId = ${groupId}`
  db.coreQuery(sql).then(queryResult => res.json(util.success(queryResult))).catch(err => next(err))

})
router.get('/searchGroupMember', (req, res, next) => {
  let { groupId, nickName } = req.query
  let sql = `select * from users where groupDuty=2 and groupId = ${groupId} and nickName like '%${nickName}%'`
  db.coreQuery(sql).then(queryResult => res.json(util.success(queryResult))).catch(err => next(err))

})
router.post('/addManage', (req, res, next) => {
  let id = req.body.userId
  let modifys = {
    groupDuty: 1
  }, conditions = {
    id,
  }
  db.update('users', modifys, conditions).then(result => res.json(util.success(result))).catch(err => next(err))

})
router.post('/signOutGroup', async (req, res, next) => {
  let { groupId, userId } = req.body
  let modifys = {
    groupName: null,
    groupDuty: null,
    groupId: null,
  }, conditions = {
    id: userId
  }
  try {
    await db.update('users', modifys, conditions)
    let result = await db.selfInOrDe('groups', 'member', 'id', groupId, false)
    res.json(util.success(result))
  } catch (err) {
    next(err)
  }
})

router.post('/sendSingIn', async (req, res, next) => {
  try {
    let id = req.body.userId
    // 查询用户是否签到过
    let queryResult = await db.onlyQuery('users', 'id', id, ['isSignIn'])
    let isSignIn = queryResult[0].isSignIn
    if (!isSignIn) {
      let selfInOrDe = await db.selfInOrDe('users', 'signInSum', 'id', id, true)
      let update = await db.update('users', { isSignIn: 1 }, { id })
    }
    // 签到成功返回0,以签到的返回1
    res.json(util.success({ isSignIn }))
  } catch (err) {
    next(err)
  }
})

router.get('/personalInvitatio', async (req, res, next) => {
  let { id, userId } = req.query
  try {
    let personal = await db.onlyQuery('users', 'id', id)
    let multipleQuery = await db.multipleQuery('userfollow', { otherId: id, userId })
    multipleQuery.length ? personal[0].isFollow = true : personal[0].isFollow = false
    return res.json(util.success(personal))
  } catch (err) {
    next(err)
  }
})


router.post('/followUser', async (req, res, next) => {
  try {
    let relation = req.body.relation
    let operate = req.body.operate
    let data = {
      mainTable: {
        name: 'users',
        modify: 'follows',
        id: relation.userId
      },
      viceTable: {
        name: 'userfollow',
        relation
      },
      operate
    }

    let result = await db.operateLSF(data, () => {
      return db.selfInOrDe(data.mainTable.name, 'fans', 'id', relation.otherId, true)
    }, () => {
      return db.selfInOrDe(data.mainTable.name, 'fans', 'id', relation.otherId, false)
    })
    res.json(util.success(result))
  }
  catch (err) {
    next(err)
  }
})

router.get('/getUserFollow', async (req, res, next) => {
  let { userId, otherId, pageSize, pageIndex } = req.query
  userId = parseInt(userId)
  try {
    let sql = `SELECT t2.id, t2.nickName, t2.avatarUrl, t2.gender,t2.constellation,t2.age  FROM (select * from userfollow where userId = ${otherId} ORDER BY id DESC) AS t1 INNER JOIN users t2 ON t1.otherId = t2.id LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let list = await db.coreQuery(sql)
    list = await relationship(list, userId)
    res.json(util.success(list))
  } catch (err) {
    next(err)
  }
})
function relationship(list, userId) {
  return new Promise((resolve, reject) => {
    if (!list.length) resolve(list)
    let p = Promise.resolve()
    list.forEach((element, index) => {
      let sql = `SELECT * FROM userfollow WHERE (userId = ${userId} or otherId = ${userId}) AND (userId = ${element.id} or  otherId = ${element.id})`
      p = p.then(() => db.coreQuery(sql)).then(result => {
        if (result.length == 2) {
          // 互关
          element.followType = 3
        } else if (result.length == 1) {
          if (result[0].userId == userId) {
            element.followType = 2
            // 我关注你
          } else {
            element.followType = 1
            // 你关注我
          }

        }
        if (index == list.length - 1) {
          resolve(list)
        }
        return
      })
    })
  })

}
router.get('/getUserFan', async (req, res, next) => {
  let { userId, otherId, pageSize, pageIndex } = req.query
  userId = parseInt(userId)
  try {
    let sql = `SELECT t2.id, t2.nickName, t2.avatarUrl, t2.gender,t2.constellation,t2.age  FROM (select * from userfollow where otherId = ${otherId} ORDER BY id DESC) AS t1 INNER JOIN users t2 ON t1.userId = t2.id LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let list = await db.coreQuery(sql)
    list = await relationship(list, userId)
    res.json(util.success(list))
  } catch (err) {
    next(err)
  }
})
module.exports = router;
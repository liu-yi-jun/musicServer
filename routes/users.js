var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')
let request = require('request');
let wx = require('../config/config').wx
const my_crypto = require('../util/my_crypto')
let handleToken = require('../util/handleToken')
var WXBizDataCrypt = require('../util/WXBizDataCrypt')
const subscribe = require('../util/subscribe');

router.get('/getToken', (req, res, next) => {
  let code = req.query.code
  let sessionUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${wx.appId}&secret=${wx.appSecret}&js_code=${code}&grant_type=authorization_code`
  request(sessionUrl, async (err, response, body) => {
    let data = JSON.parse(body);
    if (data.errmsg) return res.json(util.fail(data.errmsg))

    try {
      data.openid = my_crypto.aesEncrypt(data.openid)
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
      let openid = info.openid
      // let openid = 'da694b9d14e6300514b3e5a2025a5f1bc111883a1f538b1860b0c34ae197faa4'
      let result = await queryUser(openid)
      if (!result.userInfo) return res.json(util.success(result))
      let myGrouList = await db.onlyQuery('manygroups', 'userId', result.userInfo.id)
      result.myGrouList = myGrouList
      return res.json(util.success(result))
    })
  } catch (err) {
    next(err)
  }
})

router.get('/simpleGetServerUserInfo', (req, res, next) => {
  try {
    handleToken.verifyToken(req.headers.token).then(async info => {
      let openid = info.openid
      let result = await queryUser(openid)
      if (!result.userInfo) return res.json(util.success(result))

      let myGrouList = await db.onlyQuery('manygroups', 'userId', result.userInfo.id)
      result.myGrouList = myGrouList
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
function queryUser (openid) {
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
  let { encryptedData, iv, userInfo, codeCheck } = req.body
  try {
    handleToken.verifyToken(req.headers.token).then(async info => {
      let openid = info.openid
      let session_key = info.session_key
      let result = await queryUser(openid)
      if (!result.userInfo) {
        // var pc = new WXBizDataCrypt(wx.appId, session_key)
        // var data = pc.decryptData(encryptedData, iv)
        // console.log('解密出来', data);
        userInfo.codeCheck = codeCheck
        await insertUser(openid, userInfo)
        result = await queryUser(openid)
      }
      return res.json(util.success(result))
    })
  } catch (err) {
    next(err)
  }
})
function insertUser (openid, userInfo) {
  return new Promise((resolve, reject) => {
    if (!userInfo) return reject('无法获取用户初始数据')
    let { nickName, gender, avatarUrl, codeCheck = undefined } = userInfo
    let sql = "INSERT INTO users (nickName, avatarUrl, gender,openid,codeCheck) VALUES(?, ?, ?, ?,?); "
    let params = [nickName, avatarUrl, gender, openid, codeCheck]
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

router.post('/changeBgWall', async (req, res, next) => {
  let { userId, bgWall } = req.body
  let modifys = {
    bgWall
  }, conditions = {
    id: userId
  }
  let beforeUsers = await db.onlyQuery('users', 'id', userId)
  if(beforeUsers.length){
    if(beforeUsers[0].bgWall !== bgWall) util.deleteFile(beforeUsers[0].bgWall)
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
    let beforeUsers = await db.onlyQuery('users', 'id', userId)
    if(beforeUsers.length){
      if(beforeUsers[0].avatarUrl !== avatarUrl) util.deleteFile(beforeUsers[0].avatarUrl)
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
  let sql = `SELECT t2.*  FROM (select * from manygroups where (groupDuty=0 or groupDuty=1) and groupId = ${groupId}) AS t1 INNER JOIN users t2 ON t1.userId = t2.id `
  // let sql = `select * from users where (groupDuty=0 or groupDuty=1) and groupId = ${groupId}`
  db.coreQuery(sql).then(queryResult => res.json(util.success(queryResult))).catch(err => next(err))

})
router.get('/groupMember', (req, res, next) => {
  let groupId = req.query.groupId
  // let sql = `select * from users where groupDuty=2 and groupId = ${groupId}`
  let sql = `SELECT t2.*  FROM (select * from manygroups where groupDuty=2 and groupId = ${groupId}) AS t1 INNER JOIN users t2 ON t1.userId = t2.id `
  db.coreQuery(sql).then(queryResult => res.json(util.success(queryResult))).catch(err => next(err))

})
router.get('/searchGroupMember', (req, res, next) => {
  let { groupId, nickName } = req.query
  // let sql = `select * from users where groupDuty=2 and groupId = ${groupId} and nickName like '%${nickName}%'`
  let sql = `SELECT t2.*  FROM (select * from manygroups where groupDuty=2 and groupId = ${groupId} ) AS t1 INNER JOIN users t2 ON t1.userId = t2.id where nickName like '%${nickName}%'`
  db.coreQuery(sql).then(queryResult => res.json(util.success(queryResult))).catch(err => next(err))

})
router.post('/addManage', async (req, res, next) => {
  let { userId, groupId } = req.body
  let modifys = {
    groupDuty: 1
  }, conditions = {
    id: userId
  }
  let groupIds = await db.multipleQuery('users', { id: userId }, ['groupId'])
  if (groupIds[0].groupId === groupId) {
    await db.update('users', modifys, conditions)
  }
  let updateResult = await db.update('manygroups', modifys, { userId, groupId })
  res.json(util.success(updateResult))
})
router.post('/signOutGroup', async (req, res, next) => {
  let { groupId, userId } = req.body

  await db.deleteData('manygroups', {
    groupId,
    userId
  })
  let myGrouList = await db.onlyQuery('manygroups', 'userId', userId)
  let modifys
  if (myGrouList.length) {
    let nextGroup = myGrouList[myGrouList.length - 1]
    let groupNameObj = await db.onlyQuery('groups', 'id', nextGroup.groupId, ['groupName'])
    modifys = {
      groupName: groupNameObj[0].groupName,
      groupDuty: nextGroup.groupDuty,
      groupId: nextGroup.groupId,
    }
  } else {
    modifys = {
      groupName: null,
      groupDuty: null,
      groupId: null,
    }
  }
  let conditions = {
    id: userId
  }
  try {
    await db.update('users', modifys, conditions)
    await db.selfInOrDe('groups', 'member', 'id', groupId, false)
    res.json(util.success({ result: 'ok', myGrouList }))
  } catch (err) {
    next(err)
  }
})

router.get('/sendSingIn', async (req, res, next) => {
  try {
    let id = req.query.userId
    // 查询用户是否签到过
    let queryResult = await db.onlyQuery('users', 'id', id, ['isSignIn'])
    console.log(queryResult);
    let isSignIn = queryResult[0].isSignIn
    // if (!isSignIn) {
    //   let selfInOrDe = await db.selfInOrDe('users', 'signInSum', 'id', id, true)
    //   let update = await db.update('users', { isSignIn: 1 }, { id })
    // }
    // 以签到的返回1,为签到返回0
    res.json(util.success({ isSignIn }))
  } catch (err) {
    next(err)
  }
})

router.get('/personalInvitatio', async (req, res, next) => {
  let { id, userId } = req.query
  try {
    let personal = await db.onlyQuery('users', 'id', id)
    let sql1 =  `select COUNT(*) fanNumber  from userfollow where  otherId = ${id}`
    let sql2 =  `select COUNT(*) followNumber  from userfollow where  userId = ${id}`
    let fans = await db.coreQuery(sql1)
    let follows = await db.coreQuery(sql2)
    personal[0].fans  = fans[0].fanNumber
    personal[0].follows = follows[0].followNumber
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
    let extra = req.body.extra
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
      subscribe.sendSubscribeInfo({
        otherId: relation.otherId,
        template_id: subscribe.InfoId.follow,
        "data": {
          "name1": {
            "value": util.cutstr(extra.nickName, 16)
          },
          "thing3": {
            "value": '有新的朋友关注您, 快来看看'
          }
        }
      })
      extra = {}
      extra.otherId = relation.otherId
      extra.userId = relation.userId
      extra.isNew = 1
      extra.type = 3
      db.insert('notice', extra)
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
function relationship (list, userId) {
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

router.post('/generateCode', async (req, res, next) => {
  let { userId } = req.body
  try {
    let result = await db.onlyQuery('invitation', 'userId', userId)
    if (result.length) {
      // 存在
      return res.json(util.success(result[0].code))
    } else {
      // 不存在，生成
      let code = await generateCode(8)
      db.insert('invitation', { userId, code })
      return res.json(util.success(code))
    }

  } catch (err) {
    next(err)
  }
})


function generateCode (number) {
  return new Promise(async (resolve, reject) => {
    let code = util.createCode(number)
    let result = await db.onlyQuery('invitation', 'code', code)
    if (result.length) {
      return resolve(await generateCode(number))
    } else {
      return resolve(code)
      // 不存在，生成
    }
  })
}


module.exports = router;
var express = require('express');
var router = express.Router();
var db = require('../db/db');
const subscribe = require('../util/subscribe');
let util = require('../util/util')
var sizeOf = require('image-size');
var path = require('path')

router.post('/squarePost', (req, res, next) => {
  console.log(req.body)
  let params = req.body
  params.pictureUrls = JSON.stringify(params.pictureUrls)
  params.releaseTime = Date.now()
  db.insert('squaredynamics', params).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.post('/deleteTempdynamic', (req, res, next) => {
  let userId = req.body.userId
  db.deleteData('tempdynamic', { userId }).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.post('/tempdynamic', async (req, res, next) => {
  console.log(req.body)
  let params = req.body
  params.pictureUrls = JSON.stringify(params.pictureUrls)
  let result = await db.onlyQuery('tempdynamic', 'userId', params.userId)
  if (result[0]) {
    await db.update('tempdynamic', params, { id: result[0].id })
  } else {
    await db.insert('tempdynamic', params)
  }
  res.json(util.success(result))
})

router.get('/getTempDynamic', async (req, res, next) => {
  let userId = req.query.userId
  let result = await db.onlyQuery('tempdynamic', 'userId', userId)
  return res.json(util.success(result))
})


router.get('/getSquaredynamics', async (req, res, next) => {
  let { pageSize, pageIndex, minID, userId } = req.query
  try {
    let sql
    if (minID == 0) {
      sql = `SELECT t3.* ,t4.nickName,t4.avatarUrl,t4.gender,t4.constellation,t4.age from (select t1.*,t2.groupName from squaredynamics AS t1  LEFT JOIN  groups t2 ON t1.groupId = t2.id)  AS t3 INNER JOIN users t4 ON t3.userId = t4.id ORDER BY t3.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    } else {
      sql = `SELECT t3.* ,t4.nickName,t4.avatarUrl,t4.gender,t4.constellation,t4.age from (select t1.*,t2.groupName from squaredynamics AS t1  LEFT JOIN  groups t2 ON t1.groupId = t2.id)  AS t3 INNER JOIN users t4 ON t3.userId = t4.id where t3.id < ${minID} ORDER BY t3.id DESC LIMIT ${pageSize} `
    }


    let squaredynamics = await db.coreQuery(sql)
    // let squaredynamics = await db.paging('squaredynamics', pageSize, pageIndex, {}, ['id DESC'])
    if (!squaredynamics.length) {
      return res.json(util.success([]))
    }
    let p1 = db.isLike(squaredynamics, 'squaredynamicslike', userId, 'squaredynamicsId', (element) => {
      element.introduce = util.cutstr(element.introduce, 150)
      element.pictureUrls = JSON.parse(element.pictureUrls)
      element.releaseTime = util.getDateDiff(element.releaseTime)
    })
    let p2 = db.isStore(squaredynamics, 'squaredynamicsstore', userId, 'squaredynamicsId')

    function imgSizeOf(list, index = 0) {
      try {
        for (; index < list.length; index++) {
          const element = list[index];
          if (element.pictureUrls.length === 1) {
            var dimensions = sizeOf(path.join(__dirname, '/../public/image' + element.pictureUrls[0].split('image')[1]));
            element.imgWidth = dimensions.width
            element.imgHeight = dimensions.height / element.imgWidth * 200
          }
        }
      } catch (err) {
        console.log('err',err);
        imgSizeOf(list,++index)
      }
    }

    Promise.all([p1, p2]).then((result) => {
      imgSizeOf(result[0], 0)
       res.json(util.success(result[0]))
    })
  } catch (err) {
    next(err)
  }
})

router.post('/squaredynamicsLike', async (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let extra = req.body.extra
  let data = {
    mainTable: {
      name: 'squaredynamics',
      modify: 'likes',
      id: relation.themeId
    },
    viceTable: {
      name: 'squaredynamicslike',
      relation: {
        userId: relation.userId,
        squaredynamicsId: relation.themeId
      }
    },
    operate
  }
  let dynamic = await db.onlyQuery(data.mainTable.name, 'id', relation.themeId)
  if (!dynamic.length) return res.json(util.success(0))
  extra.userId = relation.userId
  extra.theme = data.mainTable.name
  extra.themeId = relation.themeId
  extra.isNew = 1
  extra.type = 0
  db.operateLSF(data, () => {
    if (extra.userId != extra.otherId) {
      subscribe.sendSubscribeInfo({
        otherId: extra.otherId,
        template_id: subscribe.InfoId.like,
        "data": {
          "thing1": {
            "value": util.cutstr(extra.themeTitle, 16)
          },
          "name2": {
            "value": util.cutstr(relation.nickName, 6)
          }
        }
      })
      return db.insert('notice', extra)
    }
  }, () => {
    if (extra.userId != extra.otherId) {
      let sql = `DELETE FROM notice WHERE userId = ${relation.userId} and theme = '${data.mainTable.name}' and themeId = ${data.mainTable.id}`
      return db.coreQuery(sql)
    }
  }).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))
})
router.post('/squaredynamicsStore', async (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate

  let data = {
    mainTable: {
      name: 'squaredynamics',
      modify: 'store',
      id: relation.themeId
    },
    viceTable: {
      name: 'squaredynamicsstore',
      relation: {
        userId: relation.userId,
        squaredynamicsId: relation.themeId
      }
    },
    operate
  }
  let dynamic = await db.onlyQuery(data.mainTable.name, 'id', relation.themeId)
  if (!dynamic.length) return res.json(util.success(0))
  db.operateLSF(data).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))

})

router.get('/getDynamics', async (req, res, next) => {
  let { pageSize, pageIndex, userId, otherId } = req.query
  try {
    pageSize = Math.ceil(pageSize / 2)
    // let groupdynamics = await db.paging('groupdynamics', Math.ceil(pageSize / 2), pageIndex, { userId }, ['id DESC'])

    let sql1 = `SELECT t3.* ,t4.nickName,t4.avatarUrl,t4.gender,t4.constellation,t4.age from (select t1.*,t2.groupName  from groupdynamics  AS t1 LEFT JOIN  groups t2 ON t1.groupId = t2.id where t1.userId=${otherId})  AS t3 INNER JOIN users t4 ON t3.userId = t4.id ORDER BY t3.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let sql2 = `SELECT t3.* ,t4.nickName,t4.avatarUrl,t4.gender,t4.constellation,t4.age from (select t1.*,t2.groupName  from squaredynamics  AS t1 LEFT JOIN  groups t2 ON t1.groupId = t2.id where t1.userId=${otherId})  AS t3 INNER JOIN users t4 ON t3.userId = t4.id ORDER BY t3.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let groupdynamics = await db.coreQuery(sql1)
    let squaredynamics = await db.coreQuery(sql2)
    let p1 = db.isLike(groupdynamics, 'groupdynamiclike', parseInt(userId), 'groupDynamicId')
    let p2 = db.isStore(groupdynamics, 'groupdynamicstore', userId, 'groupDynamicId')
    let p3 = db.isLike(squaredynamics, 'squaredynamicslike', userId, 'squaredynamicsId')
    let p4 = db.isStore(squaredynamics, 'squaredynamicsstore', userId, 'squaredynamicsId')

    Promise.all([p1, p2, p3, p4]).then((result) => {
      let dynamics = result[0].concat(result[2])
      dynamics.sort((a, b) => {
        return b.releaseTime - a.releaseTime
      })
      dynamics.forEach((item, index) => {
        item.releaseTime = util.getDateDiff(item.releaseTime)
        item.pictureUrls = JSON.parse(item.pictureUrls)
        item.introduce = util.cutstr(item.introduce, 150)
      })
      return res.json(util.success(dynamics))
    })
  } catch (err) {
    next(err)
  }
})

router.get('/myStoreDynamic', async (req, res, next) => {
  let { pageSize, pageIndex, userId } = req.query
  try {
    pageSize = Math.ceil(pageSize / 2)

    let sql1 = `select t2.*, t3.nickName,t3.avatarUrl,t3.gender,t3.constellation,t3.age, t4.groupName from groupdynamicstore t1 inner join groupdynamics t2 on t1.groupDynamicId=t2.id inner join users t3 on t2.userId=t3.id left join groups t4 on t2.groupId = t4.id where t2.userId = ${userId} ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let sql2 = `select t2.*, t3.nickName,t3.avatarUrl,t3.gender,t3.constellation,t3.age, t4.groupName from squaredynamicsstore t1 inner join squaredynamics t2 on t1.squaredynamicsId=t2.id inner join users t3 on t2.userId=t3.id left join groups t4 on t2.groupId = t4.id where t2.userId = ${userId} ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`

    let groupdynamics = await db.coreQuery(sql1)
    let squaredynamics = await db.coreQuery(sql2)
    let p1 = db.isLike(groupdynamics, 'groupdynamiclike', userId, 'groupDynamicId')
    groupdynamics.forEach(item => {
      item.isStore = true
      item.introduce = util.cutstr(item.introduce, 150)
    })
    // let p2 = db.isStore(groupdynamics, 'groupdynamicstore', userId, 'groupDynamicId')
    let p2 = db.isLike(squaredynamics, 'squaredynamicslike', userId, 'squaredynamicsId')
    // let p4 = db.isStore(squaredynamics, 'squaredynamicsstore', userId, 'squaredynamicsId')
    squaredynamics.forEach(item => {
      item.isStore = true
      item.introduce = util.cutstr(item.introduce, 150)
    })

    Promise.all([p1, p2]).then((result) => {
      let dynamics = result[0].concat(result[1])
      dynamics.sort((a, b) => {
        return b.releaseTime - a.releaseTime
      })
      dynamics.forEach((item, index) => {
        item.releaseTime = util.getDateDiff(item.releaseTime)
        item.pictureUrls = JSON.parse(item.pictureUrls)
      })
      return res.json(util.success(dynamics))
    })



  } catch (err) {
    next(err)
  }
})

router.get('/topicDynamic', async (req, res, next) => {
  let { pageSize, pageIndex, userId, topicId } = req.query
  try {
    let sql = `SELECT t1.* ,t2.nickName,t2.avatarUrl,t2.gender,t2.constellation,t2.age from (select * from squaredynamics where topicId=${topicId})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let squaredynamics = await db.coreQuery(sql)
    // let squaredynamics = await db.paging('squaredynamics', pageSize, pageIndex, { topicId }, ['id DESC'])
    if (!squaredynamics.length) {
      return res.json(util.success([]))
    }
    let p1 = db.isLike(squaredynamics, 'squaredynamicslike', userId, 'squaredynamicsId', (element) => {
      element.pictureUrls = JSON.parse(element.pictureUrls)
      element.releaseTime = util.getDateDiff(element.releaseTime)
    })
    let p2 = db.isStore(squaredynamics, 'squaredynamicsstore', userId, 'squaredynamicsId')
    Promise.all([p1, p2]).then((result) => {
      res.json(util.success(result[0]))
    })
  } catch (err) {
    next(err)
  }
})

router.post('/squaredynamicsDelete', async (req, res, next) => {
  try {
    const { id, tableName } = req.body

    let dynamic = await db.onlyQuery(tableName, 'id', id)
    if (!dynamic.length) return res.json(util.success(0))
    let result = await db.deleteData(tableName, { id })
    await db.deleteData(`${tableName}like`, { [tableName + 'Id']: id })
    await db.deleteData(`${tableName}store`, { [tableName + 'Id']: id })
    await db.deleteData('comment', { theme: tableName, themeId: id })
    util.deleteFiles(JSON.parse(dynamic[0].pictureUrls))
    if(dynamic[0].videoUrl) util.deleteFile(dynamic[0].videoUrl)
    if(dynamic[0].voiceUrl) util.deleteFile(dynamic[0].voiceUrl)
    res.send(util.success(result))
  } catch (err) {
    next(err)
  }
})

router.get('/getMysquareDynamics', async (req, res, next) => {
  let { pageSize, pageIndex, userId, minID } = req.query
  try {
    let sql
    if (minID == 0) {
      sql = `SELECT t1.* ,t2.nickName,t2.avatarUrl,t2.gender,t2.constellation,t2.age from (select * from squaredynamics where userId=${userId})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    } else {
      sql = `SELECT t1.* ,t2.nickName,t2.avatarUrl,t2.gender,t2.constellation,t2.age from (select * from squaredynamics where userId=${userId})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id  where t1.id < ${minID}  ORDER BY t1.id DESC LIMIT ${pageSize}`
    }
    let squaredynamics = await db.coreQuery(sql)
    // let squaredynamics = await db.paging('squaredynamics', pageSize, pageIndex, { userId }, ['id DESC'])
    let p1 = db.isLike(squaredynamics, 'squaredynamicslike', userId, 'squaredynamicsId', (element) => {
      element.introduce = util.cutstr(element.introduce, 150)
      element.pictureUrls = JSON.parse(element.pictureUrls)
      element.releaseTime = util.getDateDiff(element.releaseTime)
    })
    let p2 = db.isStore(squaredynamics, 'squaredynamicsstore', userId, 'squaredynamicsId')
    Promise.all([p1, p2]).then((result) => {
      res.json(util.success(result[0]))
    })
  } catch (err) {
    next(err)
  }
})


module.exports = router;
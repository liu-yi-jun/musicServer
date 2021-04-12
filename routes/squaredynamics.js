var express = require('express');
var router = express.Router();
var db = require('../db/db');
const subscribe = require('../util/subscribe');
let util = require('../util/util')

router.post('/squarePost', (req, res, next) => {
  console.log(req.body)
  let params = req.body
  params.pictureUrls = JSON.stringify(params.pictureUrls)
  params.releaseTime = Date.now()
  db.insert('squaredynamics', params).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.get('/getSquaredynamics', async (req, res, next) => {
  let { pageSize, pageIndex, userId } = req.query
  try {

    let squaredynamics = await db.paging('squaredynamics', pageSize, pageIndex, {}, ['id DESC'])
    if (!squaredynamics.length) {
      return res.json(util.success([]))
    }
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

router.post('/squaredynamicsLike', (req, res, next) => {
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
            "value": util.cutstr(extra.nickName, 16)
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
router.post('/squaredynamicsStore', (req, res, next) => {
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
  db.operateLSF(data).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))

})

router.get('/getDynamics', async (req, res, next) => {
  let { pageSize, pageIndex, userId } = req.query
  try {
    let groupdynamics = await db.paging('groupdynamics', Math.ceil(pageSize / 2), pageIndex, { userId }, ['id DESC'])
    let squaredynamics = await db.paging('squaredynamics', Math.ceil(pageSize / 2), pageIndex, { userId }, ['id DESC'])
    let p1 = db.isLike(groupdynamics, 'groupdynamiclike', userId, 'groupDynamicId')
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
    let sql1 = `SELECT t2.*  FROM (select * from groupdynamicstore where userId = ${userId} ORDER BY id DESC) AS t1 INNER JOIN groupdynamics t2 ON t1.groupDynamicId = t2.id LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let sql2 = `SELECT t2.*  FROM (select * from squaredynamicsstore where userId = ${userId} ORDER BY id DESC) AS t1 INNER JOIN squaredynamics t2 ON t1.squaredynamicsId = t2.id LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
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

    let squaredynamics = await db.paging('squaredynamics', pageSize, pageIndex, { topicId }, ['id DESC'])
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
    let result = await db.deleteData(tableName, { id })
    await db.deleteData(`${tableName}like`, { [tableName + 'Id']: id })
    await db.deleteData(`${tableName}store`, { [tableName + 'Id']: id })
    await db.deleteData('comment', { theme: tableName, themeId: id })
    res.send(util.success(result))
  } catch (err) {
    next(err)
  }
})

router.get('/getMysquareDynamics', async (req, res, next) => {
  let { pageSize, pageIndex, userId } = req.query
  try {
    let squaredynamics = await db.paging('squaredynamics', pageSize, pageIndex, { userId }, ['id DESC'])
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
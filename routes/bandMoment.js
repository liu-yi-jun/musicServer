var express = require('express');
var router = express.Router();
var db = require('../db/db');
const subscribe = require('../util/subscribe');
let util = require('../util/util')

router.post('/issueMoment', (req, res, next) => {
  let params = req.body
  params.releaseTime = Date.now()
  db.insert('bandmoment', params).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.get('/getMoment', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, userId,minID } = req.query
    let sql
    if (minID == 0) {
      sql = `SELECT t1.* ,t2.nickName,t2.avatarUrl from (select * from bandmoment)  AS t1 INNER JOIN users t2 ON t1.userId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    } else {
      sql = `SELECT t1.* ,t2.nickName,t2.avatarUrl from (select * from bandmoment)  AS t1 INNER JOIN users t2 ON t1.userId = t2.id where t1.id < ${minID} ORDER BY t1.id DESC LIMIT ${pageSize}`
    }
    let moments = await db.coreQuery(sql)
    moments = await db.isStore(moments, 'bandmomentstore', userId, 'momentId', (moment) => {
      moment.releaseTime = util.getDateDiff(moment.releaseTime)
      moment.introduce = util.cutstr(moment.introduce, 50)
    })

    res.json(util.success(moments))
  } catch (err) {
    next(err)
  }
})


router.get('/momentDetailAndCommont', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, id, table, type, userId } = req.query
    // 如果type = detail 则返回详情和评论，否则返回评论
    if (type === 'detail') {
      let sql = `SELECT t1.* ,t2.nickName,t2.avatarUrl from (select * from ${table} where id=${id})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id`
      let details = await db.coreQuery(sql)
      let bandmomentlike = await db.multipleQuery('bandmomentlike', { momentId: id, userId })
      let bandmomentstore = await db.multipleQuery('bandmomentstore', { momentId: id, userId })

      details[0].releaseTime = util.getDateDiff(details[0].releaseTime)
      bandmomentlike.length ? details[0].isLike = true : details[0].isLike = false
      bandmomentstore.length ? details[0].isStore = true : details[0].isStore = false
      let commentArr = await db.queryComment(pageSize, pageIndex, table, id)
      res.json(util.success({
        detail: details[0],
        commentArr
      }))
    } else {
      let commentArr = await db.queryComment(pageSize, pageIndex, table, id)
      res.json(util.success({
        commentArr
      }))
    }
  } catch (err) {
    next(err)
  }
})

router.post('/bandmomentLike', (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let extra = req.body.extra
  let data = {
    mainTable: {
      name: 'bandmoment',
      modify: 'likes',
      id: relation.themeId
    },
    viceTable: {
      name: 'bandmomentlike',
      relation: {
        userId: relation.userId,
        momentId: relation.themeId
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
router.post('/bandmomentStore', (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let data = {
    mainTable: {
      name: 'bandmoment',
      modify: 'store',
      id: relation.themeId
    },
    viceTable: {
      name: 'bandmomentstore',
      relation: {
        userId: relation.userId,
        momentId: relation.themeId
      }
    },
    operate
  }
  db.operateLSF(data).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))

})
router.post('/bandmomentDelete', async (req, res, next) => {
  try {
    const { id, tableName } = req.body
    let result = await db.deleteData(tableName, { id })
    await db.deleteData('comment', { theme: tableName, themeId: id })
    res.send(util.success(result))
  } catch (err) {
    next(err)
  }
})


router.get('/mybandmoment', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, userId } = req.query
    let sql = `SELECT t1.* ,t2.nickName,t2.avatarUrl from (select * from bandmoment  where userId = ${userId})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let moments = await db.coreQuery(sql)
    moments = await db.isStore(moments, 'bandmomentstore', userId, 'momentId', (moment) => {
      moment.releaseTime = util.getDateDiff(moment.releaseTime)
      moment.introduce = util.cutstr(moment.introduce, 50)
    })
    return res.json(util.success(moments))
  } catch (err) {
    next(err)
  }
})

router.get('/myStoreMoment', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, userId } = req.query
    let sql = `SELECT t3.* ,t4.nickName,t4.avatarUrl from ( SELECT t2.*  FROM (select * from bandmomentstore where userId = ${userId} ORDER BY id DESC) AS t1 INNER JOIN bandmoment t2 ON t1.momentId = t2.id  ) AS t3 INNER JOIN users t4 ON t3.userId = t4.id  LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let moment = await db.coreQuery(sql)
    moment.forEach(item => {
      item.isStore = true
      item.releaseTime = util.getDateDiff(moment.releaseTime)
      item.introduce = util.cutstr(moment.introduce, 50)
    })
    return res.json(util.success(moment))
  } catch (err) {
    next(err)
  }
})


module.exports = router;
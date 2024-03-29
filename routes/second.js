var express = require('express');
var router = express.Router();
var db = require('../db/db');
const subscribe = require('../util/subscribe');
let util = require('../util/util')


router.post('/secondIssue', (req, res, next) => {
  try {
    console.log(req.body)
    let params = req.body
    params.pictureUrls = JSON.stringify(params.pictureUrls)
    params.releaseTime = Date.now()
    db.insert('second', params).then(result => res.json(util.success(result))).catch(err => next(err))
  } catch (err) {
    next(err)
  }
})

router.post('/followSecond', async (req, res, next) => {
  try {
    let relation = req.body.relation
    let operate = req.body.operate
    let data = {
      mainTable: {
        name: 'second',
        modify: 'store',
        id: relation.secondId
      },
      viceTable: {
        name: 'secondstore',
        relation
      },
      operate
    }

    let result = await db.operateLSF(data)
    res.json(util.success(result))
  }
  catch (err) {
    next(err)
  }
})

router.get('/searchSeconds', async (req, res, next) => {
  try {
    let { brand, pageSize, pageIndex, userId,minID } = req.query
    let sql
    if(minID == 0) {
      sql = `SELECT t1.* ,t2.nickName,t2.avatarUrl from (select * from second  where brand like '%${brand}%')  AS t1 INNER JOIN users t2 ON t1.userId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    }else {
      sql = `SELECT t1.* ,t2.nickName,t2.avatarUrl from (select * from second  where brand like '%${brand}%')  AS t1 INNER JOIN users t2 ON t1.userId = t2.id where t1.id < ${minID} ORDER BY t1.id DESC LIMIT ${pageSize}`
    }

    let seconds = await db.coreQuery(sql)
    seconds = await db.isStore(seconds, 'secondstore', userId, 'secondId', (second) => {
      second.pictureUrls = JSON.parse(second.pictureUrls)
      second.additional = util.cutstr(second.additional, 50)
    })
    res.json(util.success(seconds))
  } catch (err) {
    next(err)
  }
})

router.get('/myStoreSecond', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, userId } = req.query
    // let sql = `SELECT t2.*  FROM (select * from secondstore where userId = ${userId}) AS t1 INNER JOIN second t2 ON t1.secondId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let sql = `SELECT t3.* ,t4.nickName,t4.avatarUrl from ( SELECT t2.*  FROM (select * from secondstore where userId = ${userId} ORDER BY id DESC) AS t1 INNER JOIN second t2 ON t1.secondId = t2.id  ) AS t3 INNER JOIN users t4 ON t3.userId = t4.id  LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let second = await db.coreQuery(sql)
    second.forEach(item => {
      item.isStore = true
      item.pictureUrls = JSON.parse(item.pictureUrls)
      item.additional = util.cutstr(item.additional, 50)
    })
    return res.json(util.success(second))
  } catch (err) {
    next(err)
  }
})

router.get('/secondDetailAndCommont', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, id, table, type, userId } = req.query
    // 如果type = detail 则返回详情和评论，否则返回评论
    if (type === 'detail') {
      // let details = await db.onlyQuery(table, 'id', id)
      let sql = `SELECT t1.* ,t2.nickName,t2.avatarUrl from (select * from ${table} where id=${id})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id`
      let details = await db.coreQuery(sql)
      let secondlike = await db.multipleQuery('secondlike', { secondId: id, userId })
      let secondstore = await db.multipleQuery('secondstore', { secondId: id, userId })
      // details[0].releaseTime = util.getDateDiff(details[0].releaseTime)
      details[0].pictureUrls = JSON.parse(details[0].pictureUrls)
      details[0].releaseTime = util.getDateDiff(details[0].releaseTime)
      secondlike.length ? details[0].isLike = true : details[0].isLike = false
      secondstore.length ? details[0].isStore = true : details[0].isStore = false
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

router.post('/secondLike', (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let extra = req.body.extra
  let data = {
    mainTable: {
      name: 'second',
      modify: 'likes',
      id: relation.themeId
    },
    viceTable: {
      name: 'secondlike',
      relation: {
        userId: relation.userId,
        secondId: relation.themeId
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
router.post('/secondStore', (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let data = {
    mainTable: {
      name: 'second',
      modify: 'store',
      id: relation.themeId
    },
    viceTable: {
      name: 'secondstore',
      relation: {
        userId: relation.userId,
        secondId: relation.themeId
      }
    },
    operate
  }
  db.operateLSF(data).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))

})
router.post('/secondDelete', async (req, res, next) => {
  try {
    const { id, tableName } = req.body
    let result = await db.deleteData(tableName, { id })
    await db.deleteData('comment', { theme: tableName, themeId: id })
    res.send(util.success(result))
  } catch (err) {
    next(err)
  }
})

router.get('/mySecond', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, userId } = req.query
    let sql = `SELECT t1.* ,t2.nickName,t2.avatarUrl from (select * from second  where userId = ${userId})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let seconds = await db.coreQuery(sql)
    seconds = await db.isStore(seconds, 'secondstore', userId, 'secondId', (second) => {
      second.pictureUrls = JSON.parse(second.pictureUrls)
      second.additional = util.cutstr(second.additional, 50)
    })
    return res.json(util.success(seconds))
  } catch (err) {
    next(err)
  }
})



module.exports = router;
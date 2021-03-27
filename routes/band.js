const { json } = require('express');
var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.post('/issueTeam', (req, res, next) => {
  let params = req.body
  params.existArr = JSON.stringify(params.existArr)
  params.recruitArr = JSON.stringify(params.recruitArr)
  params.releaseTime = Date.now()
  db.insert('band', params).then(result => res.json(util.success(result))).catch(err => next(err))
})
router.post('/saveTeam', (req, res, next) => {
  let params = req.body
  let modifys = {
    title: params.title,
    introduce: params.introduce,
    existArr: JSON.stringify(params.existArr),
    recruitArr: JSON.stringify(params.recruitArr)
  }
  db.update('band', modifys, { id: params.themeId }).then(result => res.json(util.success(result))).catch(err => next(err))
})
router.get('/getBands', (req, res, ext) => {
  let { pageSize, pageIndex } = req.query
  let some = ['id', 'userId', 'groupName', 'existArr', 'recruitArr', 'introduce', 'title']
  db.paging('band', pageSize, pageIndex, {}, ['id DESC'], some).then(result => {
    result.forEach(element => {
      element.existArr = JSON.parse(element.existArr)
      element.recruitArr = JSON.parse(element.recruitArr)
    });
    res.json(util.success(result))
  }).catch(err => next(err))
})

router.post('/joinBand', (req, res, next) => {
  let params = req.body
  params.perform = JSON.stringify(params.perform)
  db.insert('system', params).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.get('/bandDetail', async (req, res, next) => {
  try {
    let { id } = req.query
    let bandResult = await db.onlyQuery('band', 'id', id)
    let userResult = await db.onlyQuery('users', 'id', bandResult[0].userId)
    bandResult[0].user = userResult[0]
    res.json(util.success(bandResult[0]))
  } catch (err) {
    next(err)
  }
})


router.get('/bandDetailAndCommont', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, id, table, type, userId } = req.query
    // 如果type = detail 则返回详情和评论，否则返回评论
    if (type === 'detail') {
      let details = await db.onlyQuery(table, 'id', id)
      let bandlike = await db.multipleQuery('bandlike', { bandId: id, userId })
      let bandstore = await db.multipleQuery('bandstore', { bandId: id, userId })
      db.selfInOrDe('band', 'views', 'id', id, true)
      bandlike.length ? details[0].isLike = true : details[0].isLike = false
      bandstore.length ? details[0].isStore = true : details[0].isStore = false
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

router.post('/bandLike', (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let extra = req.body.extra
  let data = {
    mainTable: {
      name: 'band',
      modify: 'likes',
      id: relation.themeId
    },
    viceTable: {
      name: 'bandlike',
      relation: {
        userId: relation.userId,
        bandId: relation.themeId
      }
    },
    operate
  }
  extra.userId = relation.userId
  extra.theme = data.mainTable.name
  extra.themeId = relation.themeId
  extra.isNew = 1
  db.operateLSF(data, () => {
    if (extra.userId != extra.otherId) {
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
router.post('/bandStore', (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let data = {
    mainTable: {
      name: 'band',
      modify: 'store',
      id: relation.themeId
    },
    viceTable: {
      name: 'bandstore',
      relation: {
        userId: relation.userId,
        bandId: relation.themeId
      }
    },
    operate
  }
  db.operateLSF(data).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))

})
router.get('/myStoreBand', async (req, res, next) => {
  let { pageSize, pageIndex, userId } = req.query
  try {
    let sql = `SELECT t2.id, t2.userId,t2.groupName,t2.existArr,t2.recruitArr,t2.introduce from (select * from bandstore where userId = ${userId})  AS t1 INNER JOIN band t2 ON t1.bandId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let bands = await db.coreQuery(sql)
    bands.forEach(item => {
      item.existArr = JSON.parse(item.existArr)
      item.recruitArr = JSON.parse(item.recruitArr)
    })
    res.json(util.success(bands))
  } catch (err) {
  }
})

router.post('/bandDelete', async (req, res, next) => {
  try {
    const { id, tableName } = req.body
    let result = await db.deleteData(tableName, { id })
    await db.deleteData('comment', { theme: tableName, themeId: id })
    res.send(util.success(result))
  } catch (err) {
    next(err)
  }
})
module.exports = router;
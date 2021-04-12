var express = require('express');
var router = express.Router();
var db = require('../db/db');
const subscribe = require('../util/subscribe');
let util = require('../util/util')
router.post('/ticketIssue', (req, res, next) => {
  console.log(req.body)
  let params = req.body
  params.pictureUrls = JSON.stringify(params.pictureUrls)
  params.releaseTime = Date.now()
  db.insert('ticket', params).then(result => res.json(util.success(result))).catch(err => next(err))
})


router.get('/searchTickets', async (req, res, next) => {
  try {
    let { title, pageSize, pageIndex, userId } = req.query
    let tickets = await db.vague('ticket', 'title', title, pageSize, pageIndex, ['id DESC'])
    tickets = await db.isStore(tickets, 'ticketstore', userId, 'ticketId', (ticket) => {
      ticket.pictureUrls = JSON.parse(ticket.pictureUrls)
      ticket.additional = util.cutstr(ticket.additional, 50)
    })
    res.json(util.success(tickets))
  } catch (err) {
    next(err)
  }
})


router.post('/followTicket', async (req, res, next) => {
  try {
    let relation = req.body.relation
    let operate = req.body.operate
    let data = {
      mainTable: {
        name: 'ticket',
        modify: 'store',
        id: relation.ticketId
      },
      viceTable: {
        name: 'ticketstore',
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

router.get('/myStoreTicket', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, userId } = req.query
    let sql = `SELECT t2.*  FROM (select * from ticketstore where userId = ${userId}) AS t1 INNER JOIN ticket t2 ON t1.ticketId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let ticket = await db.coreQuery(sql)
    ticket.forEach(item => {
      item.isStore = true
      item.pictureUrls = JSON.parse(item.pictureUrls)
      item.additional = util.cutstr(item.additional, 50)
    })
    return res.json(util.success(ticket))
  } catch (err) {
    next(err)
  }
})

router.get('/ticketDetailAndCommont', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, id, table, type, userId } = req.query
    // 如果type = detail 则返回详情和评论，否则返回评论
    if (type === 'detail') {
      let details = await db.onlyQuery(table, 'id', id)
      let ticketlike = await db.multipleQuery('ticketlike', { ticketId: id, userId })
      let ticketstore = await db.multipleQuery('ticketstore', { ticketId: id, userId })
      // details[0].releaseTime = util.getDateDiff(details[0].releaseTime)
      details[0].pictureUrls = JSON.parse(details[0].pictureUrls)
      details[0].releaseTime = util.getDateDiff(details[0].releaseTime)
      ticketlike.length ? details[0].isLike = true : details[0].isLike = false
      ticketstore.length ? details[0].isStore = true : details[0].isStore = false
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
router.post('/ticketLike', (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let extra = req.body.extra
  let data = {
    mainTable: {
      name: 'ticket',
      modify: 'likes',
      id: relation.themeId
    },
    viceTable: {
      name: 'ticketlike',
      relation: {
        userId: relation.userId,
        ticketId: relation.themeId
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
    }
    return db.coreQuery(sql)
  }).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))

})
router.post('/ticketStore', (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let data = {
    mainTable: {
      name: 'ticket',
      modify: 'store',
      id: relation.themeId
    },
    viceTable: {
      name: 'ticketstore',
      relation: {
        userId: relation.userId,
        ticketId: relation.themeId
      }
    },
    operate
  }
  db.operateLSF(data).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))

})

router.post('/ticketDelete', async (req, res, next) => {
  try {
    const { id, tableName } = req.body
    let result = await db.deleteData(tableName, { id })
    await db.deleteData('comment', { theme: tableName, themeId: id })
    res.send(util.success(result))
  } catch (err) {
    next(err)
  }
})

router.get('/myTicket', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, userId } = req.query
    let sql = `SELECT *  FROM  ticket where userId = ${userId}  ORDER BY id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let ticket = await db.coreQuery(sql)
    ticket.forEach(item => {
      item.isStore = true
      item.pictureUrls = JSON.parse(item.pictureUrls)
      item.additional = util.cutstr(item.additional, 50)
    })
    return res.json(util.success(ticket))
  } catch (err) {
    next(err)
  }
})
module.exports = router;
var express = require('express');
var router = express.Router();
var db = require('../db/db');
const util = require('../util/util')
const handleToken = require('../util/handleToken')

router.post('/login', async (req, res, next) => {
  try {
    let { username, password } = req.body
    db.multipleQuery('bc_users', { username, password }).then((data) => {
      if (data.length) {
        let token = handleToken.createToken({
          username,
          password: password + 'shengrou'
        })
        res.send({ msg: 'ok', token })
      } else {
        res.send('no')
      }

    })

  }
  catch (err) {
    next(err)
  }
})

router.get('/getFeedBackInfo', async (req, res, next) => {
  try {
    let { page_size, page_index } = req.query
    let sql1 = `SELECT * from (select * from feedback where type = 0)  AS t1 INNER JOIN users t2 ON t1.userId = t2.id ORDER BY t1.id DESC LIMIT ${page_size} OFFSET ${page_size * (page_index - 1)}`
    let FeedBackData = await db.coreQuery(sql1)
    let sql2 = `SELECT COUNT(id) total FROM feedback WHERE type = 0 `
    let sum = await db.coreQuery(sql2)
    res.send({
      FeedBackData,
      total: sum[0].total
    })
  } catch (err) {
    next(err)
  }
})
router.get('/getReport', async (req, res, next) => {
  try {
    let { page_size, page_index } = req.query
    let sql1 = `SELECT * from (select * from feedback where type = 1)  AS t1 INNER JOIN users t2 ON t1.userId = t2.id ORDER BY t1.id DESC LIMIT ${page_size} OFFSET ${page_size * (page_index - 1)}`
    let ReportData = await db.coreQuery(sql1)
    let sql2 = `SELECT COUNT(id) total FROM feedback WHERE type = 1 `
    let sum = await db.coreQuery(sql2)
    res.send({
      ReportData,
      total: sum[0].total
    })
  } catch (err) {
    next(err)
  }
})
module.exports = router;
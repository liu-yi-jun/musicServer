
var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.post('/share', (req, res, next) => {
  let { table, id } = req.body
  db.selfInOrDe(table, 'share', 'id', id, true).then(result => res.json(util.success(result))).catch(err => next(err))
})
router.get('/allTopic', (req, res, next) => {
  let sql = 'select * FROM topic'
  db.coreQuery(sql).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.get('/getNotice', (req, res, next) => {
  let userId = req.query.userId
  db.multipleQuery('notice', { otherId: userId, isNew: 1 }).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.get('/myRelease', async (req, res, next) => {
  let { pageSize, pageIndex, userId } = req.query
  try {
    pageSize = Math.ceil(pageSize / 3)
    let sql1 = `SELECT id,title, userId,groupName,existArr,recruitArr,introduce,releaseTime from band where userId = ${userId} LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let sql2 = `SELECT id, userId,title,pictureUrls,groupId,activityTime,organization ,groupName, nickName,avatarUrl,releaseTime from alliance where userId = ${userId} LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let sql3 = `SELECT * FROM second where userId = ${userId} LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`

    let bands = await db.coreQuery(sql1)
    let alliances = await db.coreQuery(sql2)
    let seconds = await db.coreQuery(sql3)
    alliances.forEach(item => {
      item.pictureUrls = JSON.parse(item.pictureUrls)
      item.type = 1
    })
    bands.forEach(item => {
      item.existArr = JSON.parse(item.existArr)
      item.recruitArr = JSON.parse(item.recruitArr)
      item.type = 2
    })

    seconds.forEach(item => {
      item.pictureUrls = JSON.parse(item.pictureUrls)
      item.additional = util.cutstr(item.additional, 50)
      item.type = 3
    })

    Promise.all([bands, alliances, seconds]).then((result) => {
      let data = result[0].concat(result[1]).concat(result[2])
      data.sort((a, b) => {
        return b.releaseTime - a.releaseTime
      })
      return res.json(util.success(data))
    })
  } catch (err) {
    next(err)
  }
})



module.exports = router;
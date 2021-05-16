const { json } = require('express');
var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.post('/issueGroupCard', (req, res, next) => {
  console.log(req.body)
  let params = req.body
  params.releaseTime = Date.now()
  params.datumUrls = JSON.stringify(params.datumUrls)
  db.insert('groupcard', params).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.get('/getPagingGroupCard', (req, res, next) => {
  let { pageSize, pageIndex, groupId, some } = req.query
  if (some) {
    some = JSON.parse(some)
  }
  let sql = `SELECT t1.*,t2.avatarUrl adminAvatar,t2.nickName adminName from (select * from groupcard where groupId=${groupId})  AS t1 INNER JOIN users t2 ON t1.adminId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
  db.coreQuery(sql).then(result => {
    result.forEach(element => {
      element.datumUrls = JSON.parse(element.datumUrls)
      element.releaseTime = util.format(element.releaseTime)
    });
    res.json(util.success(result))
  }).catch(err => next(err))
})
module.exports = router;
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

router.post('/cardDelete', async (req, res, next) => {
  try {
    let id = req.body.id
    let beforeGroupcard = await db.onlyQuery('groupcard', 'id', id)
    if(beforeGroupcard.length){
      if(beforeGroupcard[0].datumUrls) util.deleteFiles(JSON.parse(beforeGroupcard[0].datumUrls))
      if(beforeGroupcard[0].videoUrl) util.deleteFile(beforeGroupcard[0].videoUrl)
    }
    let beforeCardrecord= await db.onlyQuery('groupcardrecord', 'groupcardId', id)
    if(beforeCardrecord.length){
      beforeCardrecord.forEach(item=> {
        if(item.recordUrl) util.deleteFile(item.recordUrl)
      })  
    }
    await db.deleteData('groupcardrecord', { groupcardId: id })
    let result = await db.deleteData('groupcard', { id })
    res.json(util.success(result))
  } catch (err) {
    next(err)
  }

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
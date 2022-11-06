var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.post('/issueGroupCardRecord', async (req, res, next) => {
  try {
    let params = req.body
    params.releaseTime = Date.now()
    let insertResult = await db.insert('groupcardrecord', params)
    let onlyQueryResult = await db.onlyQuery('groupcardrecord', 'id', insertResult.insertId)
    res.json(util.success(onlyQueryResult))
  } catch (err) {
    next(err)
  }
})
router.get('/getPagingGroupCardRecord', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, groupcardId, some, userId } = req.query
    if (some) {
      some = JSON.parse(some)
    }
    let sql = `SELECT t1.*,t2.avatarUrl from (select * from groupcardrecord where groupcardId=${groupcardId})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id ORDER BY t1.likes DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let result = await db.coreQuery(sql)
    // let result = await db.paging('groupcardrecord', pageSize, pageIndex, { groupcardId }, ['likes DESC'], some)
    if (!result.length) {
      return res.json(util.success(result))
    }
    result = await db.isLike(result, 'groupcardrecordlike', userId, 'groupcardrecordId')
    res.json(util.success(result))
  } catch (err) {
    next(err)
  }

})

router.post('/groupCardRecordLike', (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let data = {
    mainTable: {
      name: 'groupcardrecord',
      modify: 'likes',
      id: relation.themeId
    },
    viceTable: {
      name: 'groupcardrecordlike',
      relation: {
        userId: relation.userId,
        groupcardrecordId: relation.themeId
      }
    },
    operate
  }
  db.operateLSF(data).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))

})

router.post('/deleteGroupCardRecord', async (req, res, next) => {
  try {
    let { id } = req.body
    let beforecardrecord = await db.onlyQuery('groupcardrecord', 'id', id)
    if(beforecardrecord.length){
       util.deleteFile(beforecardrecord[0].recordUrl)
    }
    let result = await db.deleteData(`groupcardrecord`, { 'id': id })
    res.json(util.success(result))
  } catch (err) {
    next(err)
  }
})

module.exports = router;
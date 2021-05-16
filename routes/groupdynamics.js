const { json } = require('express');
var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')
const subscribe = require('../util/subscribe')

router.post('/pictureIssue', (req, res, next) => {
  console.log(req.body)
  let params = req.body
  params.pictureUrls = JSON.stringify(params.pictureUrls)
  params.releaseTime = Date.now()
  db.selfInOrDe('groups', 'postNumber', 'id', params.groupId, true)
  db.insert('groupdynamics', params).then(result => res.json(util.success(result))).catch(err => next(err))
})
router.post('/videoIssue', (req, res, next) => {
  console.log(req.body)
  let params = req.body
  params.releaseTime = Date.now()
  db.selfInOrDe('groups', 'postNumber', 'id', params.groupId, true)
  db.insert('groupdynamics', params).then(result => res.json(util.success(result))).catch(err => next(err))
})
router.post('/voiceIssue', (req, res, next) => {
  console.log(req.body)
  let params = req.body
  params.releaseTime = Date.now()
  db.selfInOrDe('groups', 'postNumber', 'id', params.groupId, true)
  db.insert('groupdynamics', params).then(result => res.json(util.success(result))).catch(err => next(err))
})
router.get('/groupPagingGetGroupdynamics', async (req, res, next) => {
  let { pageSize, pageIndex, groupId, userId, some } = req.query
  try {
    if (some) {
      some = JSON.parse(some)
    }
    let sql = `SELECT t1.id,t1.userId,t1.mold,t1.releaseTime,t1.voiceUrl,t1.videoUrl,t1.pictureUrls,t1.introduce,t1.likes,t1.comment,t2.nickName,t2.avatarUrl from (select * from groupdynamics where groupId=${groupId})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let groupdynamics = await db.coreQuery(sql)
    // some = ['id', 'userId', 'avatarUrl', 'nickName', 'mold', 'releaseTime', 'voiceUrl', 'videoUrl', 'pictureUrls', 'introduce', 'likes', 'comment']
    // let groupdynamics = await db.paging('groupdynamics', pageSize, pageIndex, { groupId }, ['id DESC'], some)
    if (!groupdynamics.length) {
      return res.json(util.success([]))
    }
    let p1 = db.isLike(groupdynamics, 'groupdynamiclike', userId, 'groupDynamicId', (element) => {
      element.pictureUrls = JSON.parse(element.pictureUrls)
      element.introduce = util.cutstr(element.introduce, 20)
      element.releaseTime = util.getDateDiff(element.releaseTime)
    })
    let p2 = db.isStore(groupdynamics, 'groupdynamicstore', userId, 'groupDynamicId')
    Promise.all([p1, p2]).then((result) => {
      res.json(util.success(result[0]))
    })
  } catch (err) {
    next(err)
  }
})
router.get('/dynamicDetailAndCommont', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, id, table, type } = req.query
    // 如果type = detail 则返回详情和评论，否则返回评论
    if (type === 'detail') {
      // let details = await db.onlyQuery(table, 'id', id)
      let sql = `SELECT t1.* ,t2.nickName,t2.avatarUrl from (select * from ${table} where id=${id})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id`
      let details = await db.coreQuery(sql)
      details[0].releaseTime = util.getDateDiff(details[0].releaseTime)
      details[0].pictureUrls = JSON.parse(details[0].pictureUrls)

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
router.post('/groupdynamicsLike', (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let extra = req.body.extra
  let data = {
    mainTable: {
      name: 'groupdynamics',
      modify: 'likes',
      id: relation.themeId
    },
    viceTable: {
      name: 'groupdynamiclike',
      relation: {
        userId: relation.userId,
        groupDynamicId: relation.themeId
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
router.post('/groupdynamicsStore', (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let data = {
    mainTable: {
      name: 'groupdynamics',
      modify: 'store',
      id: relation.themeId
    },
    viceTable: {
      name: 'groupdynamicstore',
      relation: {
        userId: relation.userId,
        groupDynamicId: relation.themeId
      }
    },
    operate
  }
  db.operateLSF(data).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))

})
router.post('/groupdynamicsDelete', async (req, res, next) => {
  try {
    const { id, groupId, tableName } = req.body
    let result = await db.deleteData(tableName, { id })
    await db.deleteData(`groupdynamiclike`, { 'groupDynamicId': id })
    await db.deleteData(`groupdynamicstore`, { 'groupDynamicId': id })
    await db.deleteData('comment', { theme: tableName, themeId: id })
    db.selfInOrDe('groups', 'postNumber', 'id', groupId, false)
    res.send(util.success(result))
  } catch (err) {
    next(err)
  }
})

router.get('/getMygroupdDynamics', async (req, res, next) => {
  let { pageSize, pageIndex, userId } = req.query
  try {
    let sql = `SELECT t1.* ,t2.nickName,t2.avatarUrl,t2.gender,t2.constellation,t2.age from (select * from groupdynamics where userId=${userId})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let groupdynamics = await db.coreQuery(sql)
    // let groupdynamics = await db.paging('groupdynamics', Math.ceil(pageSize / 2), pageIndex, { userId }, ['id DESC'])
    let p1 = db.isLike(groupdynamics, 'groupdynamiclike', userId, 'groupDynamicId', (element) => {
      element.pictureUrls = JSON.parse(element.pictureUrls)
      element.introduce = util.cutstr(element.introduce, 20)
      element.releaseTime = util.getDateDiff(element.releaseTime)
    })
    let p2 = db.isStore(groupdynamics, 'groupdynamicstore', userId, 'groupDynamicId')
    Promise.all([p1, p2]).then((result) => {
      res.json(util.success(result[0]))
    })
  } catch (err) {
    next(err)
  }
})


module.exports = router;
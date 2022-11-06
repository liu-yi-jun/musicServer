var express = require('express');
var router = express.Router();
var db = require('../db/db');
const subscribe = require('../util/subscribe');
let util = require('../util/util')

router.post('/addCourse', (req, res, next) => {
  console.log(req.body)
  let params = req.body
  params.pictureUrls = JSON.stringify(params.pictureUrls)
  params.releaseTime = Date.now()
  db.insert('groupcourse', params).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.post('/saveCourse',async (req, res, next) => {
  let params = req.body.params
  let id = req.body.id
  
  let beforeCourse = await db.onlyQuery('groupcourse', 'id', id)
  if(beforeCourse.length){
    if(beforeCourse[0].pictureUrls){
      let beforePictureUrls = JSON.parse(beforeCourse[0].pictureUrls)
      beforePictureUrls.forEach(beforeUrl => {
        let exist = false
        params.pictureUrls.forEach(newUrl=> {
          if(beforeUrl === newUrl) {
            exist = true
          }
        })
        if(!exist) {
          util.deleteFile(beforeUrl)
        }
      });
    } 
    if(beforeCourse[0].videoUrl !== params.videoUrl) util.deleteFile(beforeCourse[0].videoUrl)
    if(beforeCourse[0].posterUrl !== params.posterUrl) util.deleteFile(beforeCourse[0].posterUrl)
    params.pictureUrls = JSON.stringify(params.pictureUrls)
  }
  db.update('groupcourse', params, { id }).then(result => res.json(util.success(result))).catch(err => next(err))
})



router.get('/getCourses', (req, res, next) => {
  let { pageSize, pageIndex, groupId, minID } = req.query
  let sql
  if (minID == 0) {
    sql = `SELECT t1.id, t1.groupId,t1.groupName,t1.userId,t1.courseName,t1.posterUrl,t1.views,t1.store,t2.avatarUrl,t2.nickName from (select * from groupcourse where groupId=${groupId})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
  } else {
    sql = `SELECT t1.id, t1.groupId,t1.groupName,t1.userId,t1.courseName,t1.posterUrl,t1.views,t1.store,t2.avatarUrl,t2.nickName from (select * from groupcourse where groupId=${groupId})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id where t1.id < ${minID} ORDER BY t1.id DESC LIMIT ${pageSize} `
  }

  db.coreQuery(sql).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))
})


router.get('/courseDetail', async (req, res, next) => {
  try {
    let id = req.query.id
    let userId = req.query.userId
    let sql = `SELECT t1.*, t2.avatarUrl,t2.nickName from (select * from groupcourse where id=${id})  AS t1 INNER JOIN users t2 ON t1.userId = t2.id`
    let result = await db.coreQuery(sql)
    let multipleQuery = await db.multipleQuery('userfollow', { otherId: result[0].userId, userId })
    multipleQuery.length ? result[0].isFollow = true : result[0].isFollow = false
    db.selfInOrDe('groupcourse', 'views', 'id', id, true)
    result[0].releaseTime = util.handleDate(result[0].releaseTime)
    result[0].pictureUrls = JSON.parse(result[0].pictureUrls)
    let p1 = db.isLike(result, 'groupcourselike', userId, 'groupcourseId')
    let p2 = db.isStore(result, 'groupcoursestore', userId, 'groupcourseId')
    Promise.all([p1, p2]).then((result) => {
      res.json(util.success(result[0]))
    })
  } catch (err) {
    next(err)
  }
})


router.post('/groupcourseLike', (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let extra = req.body.extra
  let data = {
    mainTable: {
      name: 'groupcourse',
      modify: 'likes',
      id: relation.themeId
    },
    viceTable: {
      name: 'groupcourselike',
      relation: {
        userId: relation.userId,
        groupcourseId: relation.themeId
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
router.post('/groupcourseStore', (req, res, next) => {
  let relation = req.body.relation
  let operate = req.body.operate
  let data = {
    mainTable: {
      name: 'groupcourse',
      modify: 'store',
      id: relation.themeId
    },
    viceTable: {
      name: 'groupcoursestore',
      relation: {
        userId: relation.userId,
        groupcourseId: relation.themeId
      }
    },
    operate
  }
  db.operateLSF(data).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))

})


router.post('/groupcourseDelete', async (req, res, next) => {
  try {
    const { id, tableName } = req.body
    let beforeCourse = await db.onlyQuery(tableName, 'id', id)
    if(beforeCourse.length){
      if(beforeCourse[0].pictureUrls) util.deleteFiles(JSON.parse(beforeCourse[0].pictureUrls))
      if(beforeCourse[0].videoUrl) util.deleteFile(beforeCourse[0].videoUrl)
      if(beforeCourse[0].posterUrl) util.deleteFile(beforeCourse[0].posterUrl)
    }
    let result = await db.deleteData(tableName, { id })
    await db.deleteData('comment', { theme: tableName, themeId: id })
    res.send(util.success(result))
  } catch (err) {
    next(err)
  }
})


router.get('/courseCommont', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, id } = req.query
    let commentArr = await db.queryComment(pageSize, pageIndex, 'groupcourse', id)
    res.json(util.success({
      commentArr
    }))
  } catch (err) {
    next(err)
  }
})
router.get('/myStoreCourse', async (req, res, next) => {
  try {
    let { pageSize, pageIndex, userId } = req.query
    try {
      let sql = `SELECT t3.id, t3.groupId,t3.groupName,t3.userId,t3.posterUrl ,t3.courseName, t3.views,t3.store,t4.nickName,t4.avatarUrl FROM (SELECT t2.* FROM (select * from groupcoursestore where userId = ${userId} ORDER BY id DESC) AS t1 INNER JOIN groupcourse t2 ON t1.groupcourseId = t2.id) AS t3 INNER JOIN users t4 ON t3.userId = t4.id LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
      // let sql = `SELECT t2.id, t2.groupId,t2.groupName,t2.userId,t2.avatarUrl,t2.nickName,t2.posterUrl ,t2.courseName, t2.views,t2.store from (select * from groupcoursestore where userId = ${userId})  AS t1 INNER JOIN groupcourse t2 ON t1.groupcourseId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
      let result = await db.coreQuery(sql)
      res.json(util.success(result))
    } catch (err) {
    }
  } catch (err) {
    next(err)
  }
})

module.exports = router;
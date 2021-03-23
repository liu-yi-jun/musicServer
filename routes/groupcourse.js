var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.post('/addCourse', (req, res, next) => {
    console.log(req.body)
    let params = req.body
    params.pictureUrls = JSON.stringify(params.pictureUrls)
    params.releaseTime = Date.now()
    db.insert('groupcourse', params).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.get('/getCourses', (req, res, next) => {
    let { pageSize, pageIndex ,groupId} = req.query
    let some = ['id', 'groupId', 'groupName', 'userId', 'avatarUrl', 'nickName', 'posterUrl', 'courseName', 'views', 'store']
    db.paging('groupcourse', pageSize, pageIndex, {groupId}, ['id DESC'], some).then(result => {
        res.json(util.success(result))
    }).catch(err => next(err))
})

router.get('/courseDetail', async (req, res, next) => {
    try {
        let id = req.query.id
        let userId = req.query.userId
        let result = await db.onlyQuery('groupcourse', 'id', id)
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
            name: 'groupcourseLike',
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
            let sql = `SELECT t2.id, t2.groupId,t2.groupName,t2.userId,t2.avatarUrl,t2.nickName,t2.posterUrl ,t2.courseName, t2.views,t2.store from (select * from groupcoursestore where userId = ${userId})  AS t1 INNER JOIN groupcourse t2 ON t1.groupcourseId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
            let result = await db.coreQuery(sql)
            res.json(util.success(result))
        } catch (err) {
        }
    } catch (err) {
        next(err)
    }
})

module.exports = router;
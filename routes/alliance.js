var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')


router.post('/postAlliance', (req, res, next) => {
    console.log(req.body)
    let params = req.body
    params.pictureUrls = JSON.stringify(params.pictureUrls)
    params.releaseTime = Date.now()
    db.insert('alliance', params).then(result => res.json(util.success(result))).catch(err => next(err))
})
router.get('/getAlliance', async (req, res, next) => {
    let { pageSize, pageIndex } = req.query
    try {
        let some = ['id', 'userId', 'title', 'pictureUrls', 'groupId', 'activityTime', 'organization', 'groupName', 'nickName', 'avatarUrl']
        let alliances = await db.paging('alliance', pageSize, pageIndex, {}, ['id DESC'], some)
        if (!alliances.length) {
            return res.json(util.success([]))
        }
        alliances.forEach(element => {
            element.pictureUrls = JSON.parse(element.pictureUrls)
        });
        return res.json(util.success(alliances))

    } catch (err) {
        next(err)
    }
})
router.get('/personalAlliance', async (req, res, next) => {
    let { pageSize, pageIndex, userId } = req.query
    try {
        let some = ['id', 'userId', 'title', 'pictureUrls', 'groupId', 'activityTime', 'organization', 'groupName', 'nickName', 'avatarUrl']
        let alliances = await db.paging('alliance', pageSize, pageIndex, { userId }, ['id DESC'], some)
        // if (!alliances.length) {
        //     return res.json(util.success([]))
        // }
        alliances.forEach(element => {
            element.pictureUrls = JSON.parse(element.pictureUrls)
        });
        return res.json(util.success(alliances))

    } catch (err) {
        next(err)
    }
})
router.get('/allianceDetailAndCommont', async (req, res, next) => {
    try {
        let { pageSize, pageIndex, id, table, type, userId } = req.query
        // 如果type = detail 则返回详情和评论，否则返回评论
        if (type === 'detail') {
            let details = await db.onlyQuery(table, 'id', id)
            let alliancelike = await db.multipleQuery('alliancelike', { allianceId: id, userId })
            let alliancestore = await db.multipleQuery('alliancestore', { allianceId: id, userId })
            details[0].releaseTime = util.getDateDiff(details[0].releaseTime)
            details[0].pictureUrls = JSON.parse(details[0].pictureUrls)
            alliancelike.length ? details[0].isLike = true : details[0].isLike = false
            alliancestore.length ? details[0].isStore = true : details[0].isStore = false
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
router.post('/allianceLike', (req, res, next) => {
    let relation = req.body.relation
    let operate = req.body.operate
    let extra = req.body.extra
    let data = {
        mainTable: {
            name: 'alliance',
            modify: 'likes',
            id: relation.themeId
        },
        viceTable: {
            name: 'alliancelike',
            relation: {
                userId: relation.userId,
                allianceId: relation.themeId
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
        }
        return db.coreQuery(sql)
    }).then(result => {
        res.json(util.success(result))
    }).catch(err => next(err))

})
router.post('/allianceStore', (req, res, next) => {
    let relation = req.body.relation
    let operate = req.body.operate
    let data = {
        mainTable: {
            name: 'alliance',
            modify: 'store',
            id: relation.themeId
        },
        viceTable: {
            name: 'alliancestore',
            relation: {
                userId: relation.userId,
                allianceId: relation.themeId
            }
        },
        operate
    }
    db.operateLSF(data).then(result => {
        res.json(util.success(result))
    }).catch(err => next(err))

})


module.exports = router;
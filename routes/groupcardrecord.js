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

        let result = await db.paging('groupcardrecord', pageSize, pageIndex, { groupcardId }, ['likes DESC'], some)
        if (!result.length) {
            res.json(util.success(result))
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
module.exports = router;
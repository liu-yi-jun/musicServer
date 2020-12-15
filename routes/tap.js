const { json } = require('express');
var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')


router.get('/getRandomTap', (req, res, next) => {

    let limit = req.query.limit
    let sql = `SELECT id, tapTitle, author FROM tap ORDER BY RAND() limit ${limit}`
    db.coreQuery(sql).then(result =>{
        res.json(util.success(result))
    }).catch(err => next(err))
})

router.get('/searchTap', async (req, res, next) => {
    try {
        let { tapTitle, limit } = req.query
        let sql = `SELECT * FROM tap where tapTitle like '%${tapTitle}%' LIMIT ${limit} `
        let taps = await db.coreQuery(sql)
        res.json(util.success(taps))
    } catch (err) {
        next(err)
    }
})
router.get('/getTapDetail', async (req, res, next) => {
    try {
        let { tapId, pageSize, pageIndex,userId } = req.query
        let tap = await db.onlyQuery('tap', 'id', tapId)
        
        tap[0].tapPicLink = JSON.parse(tap[0].tapPicLink) 
        let tapRecord = await db.paging('taprecord', pageSize, pageIndex, { tapId }, ['likes DESC'])
        tapRecord = await db.isLike(tapRecord, 'taprecordlike', userId, 'taprecordId')
        res.json(util.success({
            tapDetail: tap[0],
            tapRecord : tapRecord
        }))
    } catch (err) {
        next(err)
    }
})

router.get('/getTaps', async (req, res, next) => {
    try {
        let { tapTitle, pageSize, pageIndex } = req.query
        let sql = `select * from tap where isCharge = 0 and tapTitle like '%${tapTitle}%' ORDER BY views LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
        let taps = await db.coreQuery(sql)
        res.json(util.success(taps))
    } catch (err) {
        next(err)
    }
})


router.post('/issueTapRecord', async (req, res, next) => {
    try {
        let params = req.body
        params.releaseTime = Date.now()
        let insertResult = await db.insert('taprecord', params)
        let onlyQueryResult = await db.onlyQuery('taprecord', 'id', insertResult.insertId)
        res.json(util.success(onlyQueryResult))
    } catch (err) {
        next(err)
    }
})

router.post('/tapRecordLike', (req, res, next) => {
    let relation = req.body.relation
    let operate = req.body.operate
    let data = {
        mainTable: {
            name: 'taprecord',
            modify: 'likes',
            id: relation.themeId
        },
        viceTable: {
            name: 'taprecordlike',
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

router.get('/myStoreAlliance', async (req, res, next) => {
    try {
        let { pageSize, pageIndex, userId } = req.query
        let some = ['id', 'userId', 'title', 'pictureUrls', 'groupId', 'activityTime', 'organization', 'groupName', 'nickName', 'avatarUrl']
        let storeAlliance = await db.paging('alliancestore', pageSize, pageIndex, { userId }, ['id DESC'])
        if (!storeAlliance.length) {
            return res.json(util.success([]))
        }
        let result = await db.arrIdQuery(storeAlliance, 'alliance', 'allianceId', (item) => {
            item.pictureUrls = JSON.parse(item.pictureUrls)
        }, some)
        console.log('1111111111111', result)
        return res.json(util.success(result))
    } catch (err) {
        next(err)
    }
})



module.exports = router;
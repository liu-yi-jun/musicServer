var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.get('/getFestival', async (req, res, next) => {
    let { pageSize, pageIndex, userId } = req.query
    try {
        let some = ['id', 'price', 'showTime', 'showCity', 'showAddress', 'showTitle', 'showPoster', 'showTicket', 'share', 'store', 'comment', 'likes']
        let musicfestivals = await db.paging('musicfestival', pageSize, pageIndex, {}, ["showCity = '杭州' desc, id"], some)
        // let musicfestivals = await db.paging('musicfestival', pageSize, pageIndex, {}, ["id desc"],some)
        let p1 = db.isLike(musicfestivals, 'musicfestivallike', userId, 'musicfestivalId')
        let p2 = db.isStore(musicfestivals, 'musicfestivalstore', userId, 'musicfestivalId')
        Promise.all([p1, p2]).then((result) => {
            res.json(util.success(result[0]))
        })
    } catch (err) {
        next(err)
    }
})

router.get('/getLiveHouse', async (req, res, next) => {
    let { pageSize, pageIndex, userId } = req.query
    try {
        let some = ['id', 'price', 'showTime', 'showCity', 'showAddress', 'showTitle', 'showPoster', 'showTicket', 'share', 'store', 'comment', 'likes']
        let livehouses = await db.paging('livehouse', pageSize, pageIndex, {}, ["showCity = '杭州' desc, id"], some)
        // let livehouses = await db.paging('livehouse', pageSize, pageIndex, {}, ["id desc"],some)
        let p1 = db.isLike(livehouses, 'livehouselike', userId, 'livehouseId')
        let p2 = db.isStore(livehouses, 'livehousestore', userId, 'livehouseId')
        Promise.all([p1, p2]).then((result) => {
            res.json(util.success(result[0]))
        })
    } catch (err) {
        next(err)
    }
})

router.get('/musicfestivalDetail', async (req, res, next) => {
    try {
        let id = req.query.id
        let userId = req.query.userId
        let result = await db.onlyQuery('musicfestival', 'id', id)

        let p1 = db.isLike(result, 'musicfestivallike', userId, 'musicfestivalId')
        let p2 = db.isStore(result, 'musicfestivalstore', userId, 'musicfestivalId')
        Promise.all([p1, p2]).then((result) => {
            res.json(util.success(result[0]))
        })
    } catch (err) {
        next(err)
    }
})

router.post('/musicfestivalLike', (req, res, next) => {
    let relation = req.body.relation
    let operate = req.body.operate
    let data = {
        mainTable: {
            name: 'musicfestival',
            modify: 'likes',
            id: relation.themeId
        },
        viceTable: {
            name: 'musicfestivallike',
            relation: {
                userId: relation.userId,
                musicfestivalId: relation.themeId
            }
        },
        operate
    }
    db.operateLSF(data).then(result => {
        res.json(util.success(result))
    }).catch(err => next(err))

})
router.post('/musicfestivalStore', (req, res, next) => {
    let relation = req.body.relation
    let operate = req.body.operate
    let data = {
        mainTable: {
            name: 'musicfestival',
            modify: 'store',
            id: relation.themeId
        },
        viceTable: {
            name: 'musicfestivalstore',
            relation: {
                userId: relation.userId,
                musicfestivalId: relation.themeId
            }
        },
        operate
    }
    db.operateLSF(data).then(result => {
        res.json(util.success(result))
    }).catch(err => next(err))

})

router.get('/musicfestivalComment', async (req, res, next) => {
    try {
        let { pageSize, pageIndex, id } = req.query
        let commentArr = await db.queryComment(pageSize, pageIndex, 'musicfestival', id)
        res.json(util.success({
            commentArr
        }))
    } catch (err) {
        next(err)
    }
})


router.post('/livehouseLike', (req, res, next) => {
    let relation = req.body.relation
    let operate = req.body.operate
    console.log('relation', relation, 'operate', operate)
    let data = {
        mainTable: {
            name: 'livehouse',
            modify: 'likes',
            id: relation.themeId
        },
        viceTable: {
            name: 'livehouselike',
            relation: {
                userId: relation.userId,
                livehouseId: relation.themeId
            }
        },
        operate
    }
    db.operateLSF(data).then(result => {
        res.json(util.success(result))
    }).catch(err => next(err))

})
router.post('/livehouseStore', (req, res, next) => {
    let relation = req.body.relation
    let operate = req.body.operate
    let data = {
        mainTable: {
            name: 'livehouse',
            modify: 'store',
            id: relation.themeId
        },
        viceTable: {
            name: 'livehousestore',
            relation: {
                userId: relation.userId,
                livehouseId: relation.themeId
            }
        },
        operate
    }
    db.operateLSF(data).then(result => {
        res.json(util.success(result))
    }).catch(err => next(err))

})

router.get('/livehouseComment', async (req, res, next) => {
    try {
        let { pageSize, pageIndex, id } = req.query
        let commentArr = await db.queryComment(pageSize, pageIndex, 'livehouse', id)
        res.json(util.success({
            commentArr
        }))
    } catch (err) {
        next(err)
    }
})

router.get('/livehouseDetail', async (req, res, next) => {
    try {
        let id = req.query.id
        let userId = req.query.userId
        let result = await db.onlyQuery('livehouse', 'id', id)

        let p1 = db.isLike(result, 'livehouselike', userId, 'livehouseId')
        let p2 = db.isStore(result, 'livehousestore', userId, 'livehouseId')
        Promise.all([p1, p2]).then((result) => {
            res.json(util.success(result[0]))
        })
    } catch (err) {
        next(err)
    }
})

router.get('/myStorePerformance', async (req, res, next) => {
    let { pageSize, pageIndex, userId } = req.query
    try {
        pageSize = Math.ceil(pageSize / 2)
        let sql1 = `SELECT t2.id, t2.price,t2.showTime,t2.showCity,t2.showAddress,t2.showTitle,t2.showPoster,t2.showTicket,t2.share,t2.store,t2.comment,t2.likes from (select * from musicfestivalstore where userId = ${userId})  AS t1 INNER JOIN musicfestival t2 ON t1.musicfestivalId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
        let sql2 = `SELECT t2.id, t2.price,t2.showTime,t2.showCity,t2.showAddress,t2.showTitle,t2.showPoster,t2.showTicket,t2.share,t2.store,t2.comment,t2.likes from (select * from livehousestore where userId = ${userId})  AS t1 INNER JOIN livehouse t2 ON t1.livehouseId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
        
        let musicfestivals = await db.coreQuery(sql1)
        let livehouses = await db.coreQuery(sql2)
        let p1 = db.isLike(musicfestivals, 'musicfestivallike', userId, 'musicfestivalId')
        musicfestivals.forEach(item => {
            item.isStore = true
            item.tableName = 'musicfestival'
        })
        let p2 = db.isLike(livehouses, 'livehouselike', userId, 'livehouseId')
        livehouses.forEach(item => {
            item.isStore = true
            item.tableName = 'livehouse'
        })

        Promise.all([p1, p2]).then((result) => {
            let performaces = result[0].concat(result[1])
            return res.json(util.success(performaces))
        })

    } catch (err) {
        next(err)
    }
})




module.exports = router;
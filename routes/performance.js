var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.get('/getFestival', async (req, res, next) => {
    let { pageSize, pageIndex, userId } = req.query
    try {
        let musicfestivals = await db.paging('musicfestival', pageSize, pageIndex, {}, ['id DESC'])
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
        let livehouses = await db.paging('livehouse', pageSize, pageIndex, {}, ['id DESC'])
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
    console.log('relation',relation,'operate',operate)
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

router.get('livehouseComment', async (req, res, next) => {
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


module.exports = router;
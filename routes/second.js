var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')


router.post('/secondIssue', (req, res, next) => {
    try {
        console.log(req.body)
        let params = req.body
        params.pictureUrls = JSON.stringify(params.pictureUrls)
        params.releaseTime = Date.now()
        db.insert('second', params).then(result => res.json(util.success(result))).catch(err => next(err))
    } catch (err) {
        next(err)
    }
})

router.post('/followSecond', async (req, res, next) => {
    try {
        let relation = req.body.relation
        let operate = req.body.operate
        let data = {
            mainTable: undefined,
            viceTable: {
                name: 'secondstore',
                relation
            },
            operate
        }

        let result = await db.operateLSF(data)
        res.json(util.success(result))
    }
    catch (err) {
        next(err)
    }
})


router.get('/searchSeconds', async (req, res, next) => {
    try {
        let { brand, pageSize, pageIndex, userId } = req.query
        let seconds = await db.vague('second', 'brand', brand, pageSize, pageIndex, ['id DESC'])
        seconds = await db.isStore(seconds, 'secondstore', userId, 'secondId', (second) => {
            second.pictureUrls = JSON.parse(second.pictureUrls)
        })
        res.json(util.success(seconds))
    } catch (err) {
        next(err)
    }
})

router.get('/myStoreSecond', async (req, res, next) => {
    try {
        let { pageSize, pageIndex, userId } = req.query
        let sql = `SELECT t2.*  FROM (select * from secondstore where userId = ${userId} ORDER BY id DESC) AS t1 INNER JOIN second t2 ON t1.secondId = t2.id LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
        let second = await db.coreQuery(sql)
        second.forEach(item => {
            item.isStore = true
        })
        return res.json(util.success(second))
    } catch (err) {
        next(err)
    }
})


module.exports = router;
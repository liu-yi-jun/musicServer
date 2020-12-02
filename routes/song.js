var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.get('/getRandomSong', async (req, res, next) => {
    let userId = req.query.userId
    try {
        let sql = `SELECT * FROM song ORDER BY RAND() limit 1`
        let song = await db.coreQuery(sql)
        let result = await db.multipleQuery('songstore', { songId: song[0].id, userId })
        result.length ? song[0].isStore = true : song[0].isStore = false
        res.json(util.success(song))
    } catch (err) {
        next(err)
    }
})

router.post('/storeSong', (req, res, next) => {
    let relation = req.body.relation
    let operate = req.body.operate
    let data = {
        mainTable: undefined,
        viceTable: {
            name: 'songstore',
            relation
        },
        operate
    }
    db.operateLSF(data).then(result => {
        res.json(util.success(result))
    }).catch(err => next(err))

})


router.get('/getMyStoreSong', async (req, res, next) => {
    let { pageSize, pageIndex, userId} = req.query
    try {
        let sql = `SELECT t2.*  FROM (select * from songstore where userId = ${userId} ORDER BY id DESC) AS t1 INNER JOIN song t2 ON t1.songId = t2.id  LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
        let songStores = await db.coreQuery(sql)
        songStores.forEach((item, inedx) => {
            item.isStore = true
        })
        res.json(util.success(songStores))
    } catch (err) {
        next(err)
    }
})
module.exports = router;
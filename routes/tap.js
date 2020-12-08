var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')


router.get('/getRandomTap', (req, res, next) => {
    let limit = req.query.limit
    let sql = `SELECT id, tapTitle, author FROM tap ORDER BY RAND() limit ${limit}`
    db.coreQuery(sql).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.get('/searchTap', async (req, res, next) => {
    try {
        let { tapTitle, pageSize, pageIndex } = req.query
        let sql = `SELECT * FROM tap where tapTitle like '%${tapTitle}%' LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
        let taps = await db.coreQuery(sql)
        res.json(util.success(taps))
    } catch (err) {
        next(err)
    }
})

module.exports = router;
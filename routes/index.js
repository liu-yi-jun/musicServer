var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.post('/share', (req, res, next) => {
    let { table, id } = req.body
    db.selfInOrDe(table, 'share', 'id', id, true).then(result => res.json(util.success(result))).catch(err => next(err))
})
router.get('/allTopic', (req, res, next) => {
    let sql = 'select * FROM topic'
    db.coreQuery(sql).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.get('/getNotice', (req, res, next) => {
    let userId = req.query.userId
    db.multipleQuery('notice', {otherId: userId, isNew: 1 }).then(result => res.json(util.success(result))).catch(err => next(err))
})

module.exports = router;
const { json } = require('express');
var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.post('/issueGroupCard', (req, res, next) => {
    console.log(req.body)
    let params = req.body
    params.releaseTime = Date.now()
    params.datumUrls = JSON.stringify(params.datumUrls)
    db.insert('groupcard', params).then(result => res.json(util.success(result))).catch(err => next(err))
})

router.get('/getPagingGroupCard', (req, res, next) => {
    let { pageSize, pageIndex, groupId, some } = req.query
    console.log('11111111111', req.query)
    if (some) {
        some = JSON.parse(some)
    }
    db.paging('groupcard', pageSize, pageIndex, { groupId }, ['id DESC'], some).then(result => {
        result.forEach(element => {
            element.datumUrls = JSON.parse(element.datumUrls)
            element.releaseTime  = util.format(element.releaseTime)
        });
        res.json(util.success(result))
    }).catch(err => next(err))
})
module.exports = router;
const { json } = require('express');
var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.post('/issueTeam', (req, res, next) => {
    let params = req.body
    params.existArr = JSON.stringify(params.existArr)
    params.recruitArr = JSON.stringify(params.recruitArr)
    db.insert('band', params).then(result => res.json(util.success(result))).catch(err => next(err))
})
router.get('/getBands', (req, res, ext) => {
    let { pageSize, pageIndex } = req.query
    let some = ['id', 'userId', 'groupName', 'existArr', 'recruitArr', 'introduce']
    db.paging('band', pageSize, pageIndex, {}, ['id DESC'], some).then(result => {
        result.forEach(element => {
            element.existArr = JSON.parse(element.existArr)
            element.recruitArr = JSON.parse(element.recruitArr)
        });
        res.json(util.success(result))
    }).catch(err => next(err))
})

router.post('/joinBand', (req, res, next) => {
    let params = req.body
    params.perform = JSON.stringify(params.perform)
    params.isNew = 1
    db.insert('system', params).then(result => res.json(util.success(result))).catch(err => next(err))
})



module.exports = router;
var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.get('/getSystem', async (req, res, next) => {
    let { pageSize, pageIndex, userId } = req.query
    try {
        let system = await db.paging('system', pageSize, pageIndex, { issueId:userId }, ['id DESC'])
        system.forEach(item => {
            item.perform = JSON.parse(item.perform)
        });
        res.json(util.success(system))

    } catch (err) {
        next(err)
    }
})


module.exports = router;
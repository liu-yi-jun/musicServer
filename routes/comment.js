var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')


router.post('/sendComment', async (req, res, next) => {
    try {
        let params = req.body
        params.releaseTime = Date.now()
        let insertResult = await db.insert('comment', params)
        let selfInOrDeResult = await db.selfInOrDe(params.theme,'comment', 'id', params.themeId, true)
        res.json(util.success(insertResult)) 
    } catch (err) {
        next(err)
    }
})
router.post('/sendReply', (req, res, next) => {
    let params = req.body
    params.releaseTime = Date.now()
    db.insert('reply', params).then(result => res.json(util.success(result))).catch(err => next(err))
})
// router.get('/getCommentSum', (req, res, next) => {
//     let { theme, themeId } = req.query
//     let sql = `SELECT COUNT(*) commentSum FROM comment WHERE theme = '${theme}' and themeId = ${themeId}`
//     db.coreQuery(sql).then(result => res.json(util.success(result[0]))).catch(err => next(err))
// })


module.exports = router;
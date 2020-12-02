var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.get('/getInform', async (req, res, next) => {
    let { pageSize, pageIndex, userId } = req.query
    try {
        let informs = await db.paging('notice', pageSize, pageIndex, { userId }, ['id DESC'])
        let p1 = isLike(informs, userId)
        let p2 = isStore(informs, userId)
        Promise.all([p1, p2]).then((result) => {
            res.json(util.success(result[0]))
        })
    } catch (err) {
        next(err)
    }
})

function isLike(arr, userId) {
    return new Promise((resolve, reject) => {
        if (!arr.length) resolve([])
        let p = Promise.resolve()
        arr.forEach((element, index) => {
            p = p.then(() => {
                if (element.theme === 'groupdynamics') {
                    return db.multipleQuery('groupdynamiclike', { 'groupDynamicId': element.themeId, userId })
                } else if (element.theme === 'squaredynamics') {
                    return db.multipleQuery('squaredynamicslike', { 'squaredynamicsId': element.themeId, userId })
                }
                return Promise.resolve()
            }).then(result => {
                result && result.length ? element.isLike = true : element.isLike = false
                if (index == arr.length - 1) {
                    resolve(arr)
                }
                return
            })
        })
    })
}

function isStore(arr, userId) {
    return new Promise((resolve, reject) => {
        if (!arr.length) resolve([])
        let p = Promise.resolve()
        arr.forEach((element, index) => {
            p = p.then(() => {
                if (element.theme === 'groupdynamics') {
                    return db.multipleQuery('groupdynamicstore', { 'groupDynamicId': element.themeId, userId })
                } else if (element.theme === 'squaredynamics') {
                    return db.multipleQuery('squaredynamicslike', { 'squaredynamicsId': element.themeId, userId })
                }
                return Promise.resolve()
            }).then(result => {
                result && result.length ? element.isLike = true : element.isLike = false
                if (index == arr.length - 1) {
                    resolve(arr)
                }
                return
            })
        })
    })
}

module.exports = router; 
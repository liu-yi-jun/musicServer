var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.get('/getSystem', async (req, res, next) => {
  let { pageSize, pageIndex, userId } = req.query
  try {
    let system = await db.paging('finalsystem', pageSize, pageIndex, { otherId: userId }, ['id DESC'])
    system.forEach(item => {
      item.jsonDate = JSON.parse(item.jsonDate)
    });
    res.json(util.success(system))

  } catch (err) {
    next(err)
  }
})

router.post('/cancelSystemNew', async (req, res, next) => {
  let { userId } = req.body
  db.update('finalsystem', { isNew: 0 }, { otherId: userId }).then(result => {
    res.json(util.success(result))
  }).catch(err => next(err))
})




module.exports = router;
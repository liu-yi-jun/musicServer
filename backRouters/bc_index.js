var express = require('express');
var router = express.Router();
var db = require('../db/db');
const handleToken = require('../util/handleToken')
// 白名单
const whiteList = '/user/login'
// 验证token
router.use((req, res, next) => {
  if (!req.url.includes(whiteList)) {
    handleToken.verifyToken(req.headers.authorization).then(res => {
      next()
    }).catch(e => {
      res.status(401).send({
        code: -2,
        message: 'invalid token'
      })
    })
  } else {
    next()
  }
})


module.exports = router;
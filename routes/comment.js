var express = require('express');
var router = express.Router();
var db = require('../db/db');
const subscribe = require('../util/subscribe');
let util = require('../util/util')


router.post('/sendComment', async (req, res, next) => {
  try {
    let params = req.body
    params.releaseTime = Date.now()
    let insertResult = await db.insert('comment', {
      theme: params.theme,
      themeId: params.themeId,
      commenterId: params.commenterId,
      // commenterAvatar: params.commenterAvatar,
      // commenterName: params.commenterName,
      commentContent: params.commentContent,
      releaseTime: params.releaseTime,
    })
    await db.selfInOrDe(params.theme, 'comment', 'id', params.themeId, true)
    res.json(util.success(insertResult))
    // 消息
    if (params.commenterId !== params.themeUserId) {
      // 写入数据库
      db.insert('notice', {
        userId: params.commenterId,
        otherId: params.themeUserId,
        // nickName: params.commenterName,
        // avatarUrl: params.commenterAvatar,
        theme: params.theme,
        themeId: params.themeId,
        themeTitle: util.cutstr(params.themeTitle, 16),
        isNew: 1,
        type: 1,
        content: util.cutstr(params.commentContent, 16),
        commentId: insertResult.insertId
      })
      // 发送消息通知
      subscribe.sendSubscribeInfo({
        otherId: params.themeUserId,
        template_id: subscribe.InfoId.content,
        "data": {
          "thing1": {
            "value": util.cutstr(params.themeTitle, 16),
          },
          "thing7": {
            "value": params.type
          },
          "thing2": {
            "value": util.cutstr(params.commentContent, 16)
          },
          "thing9": {
            "value": '无'
          }
        }
      })
    }
  } catch (err) {
    next(err)
  }
})
router.post('/sendReply', async (req, res, next) => {
  try {
    let params = req.body
    params.releaseTime = Date.now()
    let insertResult = await db.insert('reply', {
      commentId: params.commentId,
      parentReplyId: params.parentReplyId,
      // parentAvatar: params.parentAvatar,
      // parentName: params.parentName,
      replyPersonId: params.replyPersonId,
      // replyPersonAvatar: params.replyPersonAvatar,
      // replyPersonName: params.replyPersonName,
      replyContent: params.replyContent,
      releaseTime: params.releaseTime,
    })
    await db.selfInOrDe(params.theme, 'comment', 'id', params.themeId, true)
    res.json(util.success(insertResult))
    // 消息
    if (params.noticeUserId !== params.replyPersonId) {
      // 写入数据库
      db.insert('notice', {
        userId: params.replyPersonId,
        otherId: params.noticeUserId,
        // nickName: params.replyPersonName,
        // avatarUrl: params.replyPersonAvatar,
        theme: params.theme,
        themeId: params.themeId,
        themeTitle: util.cutstr(params.themeTitle, 16),
        isNew: 1,
        type: 2,
        content: util.cutstr(params.replyContent, 16),
        replyId: insertResult.insertId
      })
      // 发送消息通知
      subscribe.sendSubscribeInfo({
        otherId: params.noticeUserId,
        template_id: subscribe.InfoId.reply,
        "data": {
          "thing10": {
            "value": util.cutstr(params.themeTitle, 16),
          },
          "thing1": {
            "value": util.cutstr(params.originContent, 16),
          },
          "thing3": {
            "value": util.cutstr(params.replyPersonName, 16)
          },
          "thing2": {
            "value": util.cutstr(params.replyContent, 16)
          }
        }
      })
    }
  } catch (err) {
    next(err)
  }
})
router.post('/deletecomment', async (req, res, next) => {
  try {
    let { id, theme, themeId } = req.body
    let result = await db.deleteData(`comment`, { 'id': id })
    await db.deleteData(`reply`, { 'commentId': id })
    let sql = `SELECT COUNT(id) total FROM reply WHERE commentId = ${id} `
    let sum = await db.coreQuery(sql)
    for (let i = 0; i < sum[0].total + 1; i++) {
      db.selfInOrDe(theme, 'comment', 'id', themeId, false)
    }
    res.json(util.success(result))
  } catch (err) {
    next(err)
  }
})
router.post('/deletereply', async (req, res, next) => {
  try {
    let { id, theme, themeId } = req.body
    let result = await db.deleteData(`reply`, { 'id': id })
    db.selfInOrDe(theme, 'comment', 'id', themeId, false)
    res.json(util.success(result))
  } catch (err) {
    next(err)
  }
})
// router.get('/getCommentSum', (req, res, next) => {
//     let { theme, themeId } = req.query
//     let sql = `SELECT COUNT(*) commentSum FROM comment WHERE theme = '${theme}' and themeId = ${themeId}`
//     db.coreQuery(sql).then(result => res.json(util.success(result[0]))).catch(err => next(err))
// })


module.exports = router;
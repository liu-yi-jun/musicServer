var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')
router.post('/ticketIssue', (req, res, next) => {
    console.log(req.body)
    let params = req.body
    params.pictureUrls = JSON.stringify(params.pictureUrls)
    params.releaseTime = Date.now()
    db.insert('ticket', params).then(result => res.json(util.success(result))).catch(err => next(err))
})


router.get('/searchTickets', async (req, res, next) => {
    try {
        let { title, pageSize, pageIndex, userId } = req.query
        let tickets = await db.vague('ticket', 'title', title, pageSize, pageIndex, ['id DESC'])
        tickets = await db.isStore(tickets, 'ticketstore', userId, 'ticketId', (ticket) => {
            ticket.pictureUrls = JSON.parse(ticket.pictureUrls)
        })
        res.json(util.success(tickets))
    } catch (err) {
        next(err)
    }
})


router.post('/followTicket', async (req, res, next) => {
    try {
        let relation = req.body.relation
        let operate = req.body.operate
        let data = {
            mainTable: undefined,
            viceTable: {
                name: 'ticketstore',
                relation
            },
            operate
        }

        let result = await db.operateLSF(data)
        res.json(util.success(result))
    }
    catch (err) {
        next(err)
    }
})

module.exports = router;
const { json } = require('express');
var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')

router.get('/getAllGroup', (req, res, next) => {
    let sql = 'SELECT * FROM groups where privates = 0'
    db.coreQuery(sql).then(result => {
        res.json(util.success(result))
    }).catch(err => next(err))
})
router.get('/pagingGetFollowGroup', async (req, res, next) => {
    let { pageSize, pageIndex, userId, groupName } = req.query
    try {
        let sql = `SELECT t2.*  FROM (select * from groupsfollow where userId = ${userId} ORDER BY id DESC) AS t1 INNER JOIN groups t2 ON t1.groupId = t2.id where groupName like '%${groupName}%' LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
        let groupsfollow = await db.coreQuery(sql)
        groupsfollow.forEach((item, inedx) => {
            item.isFollow = true
        })
        res.json(util.success(groupsfollow))
    } catch (err) {
        next(err)
    }
})



router.get('/searchGroup', async (req, res, next) => {
    try {
        let { groupName, pageSize, pageIndex, userId } = req.query
        let sql = `SELECT * FROM groups where groupName like '%${groupName}%' LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
        let groups = await db.coreQuery(sql)
        groups = await db.isFollow(groups, 'groupsfollow', userId, 'groupId')
        res.json(util.success(groups))
    } catch (err) {
        next(err)
    }
})
router.post('/createGroup', async (req, res, next) => {
    console.log(req.body)
    let { groupName, privates, examine, introduce, userId, groupLogo } = req.body
    privates = Boolean(privates)
    try {
        let queryResult = await db.onlyQuery('groups', 'groupName', groupName)
        if (queryResult.length) return res.send(util.fail('小组名称已存在，请重新修改'))
        let insertData = {
            privates, examine, introduce, groupLogo, groupName
        }
        let insertResult = await db.insert('groups', insertData)
        await db.selfInOrDe('groups', 'member', 'id', insertResult.insertId, true)
        let modifys = {
            groupId: insertResult.insertId,
            groupDuty: 0,//代表组长
            groupName: groupName,
            isSettle: 1//代表以及入驻过了
        }, conditions = {
            id: userId
        }
        let manygroupsInsertData = {
            groupId: insertResult.insertId,
            userId,
            groupDuty: 0
        }
        await db.insert('manygroups', manygroupsInsertData)
        let updateResult = await db.update('users', modifys, conditions)
        let onlyQueryResult = await db.onlyQuery('users', 'id', userId)
        console.log(updateResult)
        res.send(util.success(onlyQueryResult[0]))
    } catch (err) {
        next(err)
    }
})
router.get('/getGroupInfo', async (req, res, next) => {
    try {
        let groupId = req.query.groupId
        let userId = req.query.userId
        let multipleQuery = await db.multipleQuery('groupsfollow', { groupId, userId })
        let onlyQuery = await db.onlyQuery('groups', 'id', groupId)
        let myGrouList = await db.onlyQuery('manygroups', 'userId', userId)
        onlyQuery[0].myGrouList = myGrouList
        multipleQuery.length ? onlyQuery[0].isFollow = true : onlyQuery[0].isFollow = false
        res.json(util.success(onlyQuery[0]))

    } catch (err) {
        next(err)
    }
})
router.post('/joinGroup', async (req, res, next) => {
    try {
        let { groupName, userId, groupId, examine } = req.body
        // let sql = `SELECT COUNT(*) num FROM manygroups WHERE userId = ${userId}`
        // let numResult = await db.coreQuery(sql)
        // if (numResult[0].num >= 5) {
        //     console.log('66666666666')
        //     return res.json(util.success(numResult[0]))
        // }

        let groupDuty
        // -1代表审核中 2代表组员
        (examine === 1) ? groupDuty = -1 : groupDuty = 2
        let modifys = {
            groupId,
            groupDuty,
            groupName,
        }, conditions = {
            id: userId
        }
        if (groupDuty == 2) {
            await db.selfInOrDe('groups', 'member', 'id', groupId, true)
        }
        let manygroupsInsertData = {
            groupId,
            userId,
            groupDuty
        }
        await db.update('users', modifys, conditions)
        await db.insert('manygroups', manygroupsInsertData)
        let result = await db.onlyQuery('users', 'id', userId)
        let myGrouList = await db.onlyQuery('manygroups', 'userId', userId)
        res.json(util.success({myGrouList,userInfo:result[0]}))
    } catch (err) {
        next(err)
    }
})

router.post('/modifyGroup', async (req, res, next) => {
    let { groupLogo, privates, examine, introduce, id } = req.body
    try {
        let modifys = {
            groupLogo,
            privates,
            examine,
            introduce
        }, conditions = {
            id
        }
        let updateResult = await db.update('groups', modifys, conditions)
        let onlyQueryResult = await db.onlyQuery('groups', 'id', id)
        res.send(util.success(onlyQueryResult[0]))
    } catch (err) {
        next(err)
    }
})
router.post('/dissolutionGroup', async (req, res, next) => {
    let { groupId, userId } = req.body
    await db.deleteData('manygroups', {
        groupId,
        userId
      })
      let myGrouList = await db.onlyQuery('manygroups', 'userId', userId)
  let modifys
  if (myGrouList.length) {
    let nextGroup = myGrouList[myGrouList.length - 1]
    let groupNameObj = await db.onlyQuery('groups', 'id', nextGroup.groupId, ['groupName'])
    
    modifys = {
      groupName: groupNameObj[0].groupName,
      groupDuty: nextGroup.groupDuty,
      groupId: nextGroup.groupId,
    }
  } else {
    modifys = {
      groupName: null,
      groupDuty: null,
      groupId: null,
      isSettle: 0
    }
  }
    let conditions = {
        id:userId
    }
    try {
        await db.update('users', modifys, conditions)
        let deleteResult = await db.deleteData('groups', { id: groupId })
        res.json(util.success({result:deleteResult,myGrouList}))
    } catch (err) {
        next(err)
    }
})
router.get('/getRandomGroup', (req, res, next) => {
    let limit = req.query.limit
    let sql = `SELECT id, groupName FROM groups where privates = 0 ORDER BY RAND() limit ${limit}`
    db.coreQuery(sql).then(result => res.json(util.success(result))).catch(err => next(err))
})
router.post('/followGroup', (req, res, next) => {
    let relation = req.body.relation
    let operate = req.body.operate
    let data = {
        mainTable: {
            name: 'groups',
            modify: 'fansNumber',
            id: relation.groupId
        },
        viceTable: {
            name: 'groupsfollow',
            relation
        },
        operate
    }
    db.operateLSF(data).then(result => {
        res.json(util.success(result))
    }).catch(err => next(err))

})
router.get('/pagingGetGroup', async (req, res, next) => {
    let { pageSize, pageIndex, groupName } = req.query
    try {
        let sql = `SELECT * FROM groups where groupName like '%${groupName}%' LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
        let groups = await db.coreQuery(sql)
        res.json(util.success(groups))
    } catch (err) {
        next(err)
    }
})
router.get('/myGroup', async (req, res, next) => {
    let userId = req.query.userId
    try {
        let sql = `SELECT t2.*,t1.groupDuty  FROM (select * from manygroups where userId = ${userId}) AS t1 INNER JOIN groups t2 ON t1.groupId = t2.id ORDER BY t1.id DESC`
        let groups = await db.coreQuery(sql)
        groups = await db.isFollow(groups, 'groupsfollow', userId, 'groupId')
        res.json(util.success(groups))
    } catch (err) {
        next(err)
    }
})

router.post('/switchGroup', async (req, res, next) => {
    let { groupId, groupName, groupDuty, userId } = req.body
    try {
        let modifys = {
            groupId,
            groupName,
            groupDuty,
        }, conditions = {
            id: userId
        }
        let updateResult = await db.update('users', modifys, conditions)
        res.send(util.success(updateResult))
    } catch (err) {
        next(err)
    }

})



module.exports = router;

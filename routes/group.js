const { json } = require('express');
var express = require('express');
var router = express.Router();
let request = require('request');
var db = require('../db/db');
let util = require('../util/util')
let accessToken = require('../util/access_token')

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
      privates, examine, introduce, groupLogo, groupName, userId
    }
    let insertResult = await db.insert('groups', insertData)
    await db.selfInOrDe('groups', 'member', 'id', insertResult.insertId, true)
    let modifys = {
      groupId: insertResult.insertId,
      groupDuty: 0,//代表组长
      groupName: groupName,
      // isSettle: 1//代表以及入驻过了
    }, conditions = {
      id: userId
    }
    let manygroupsInsertData = {
      groupId: insertResult.insertId,
      userId,
      groupDuty: 0,
      time: Date.now()
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
    let { groupId, userId, visit } = req.query
    let multipleQuery = await db.multipleQuery('groupsfollow', { groupId, userId })
    let onlyQuery = await db.onlyQuery('groups', 'id', groupId)
    let myGrouList = await db.onlyQuery('manygroups', 'userId', userId)
    if (visit) {
      db.selfInOrDe('groups', 'visitNumber', 'id', groupId, true)
    }
    console.log(!onlyQuery[0]);
    if (!onlyQuery[0]) {
      res.json(util.success(null))
      return
    }
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
      db.selfInOrDe('groups', 'member', 'id', groupId, true)
    }
    let userIdList
    if (groupDuty == -1) {
      let sql = `select userId from manygroups where groupId = ${groupId} and (groupDuty = 0 or groupDuty = 1)`
      userIdList = await db.coreQuery(sql)
      //   userIdList = [{ userId: 47 }]
    }
    let manygroupsInsertData = {
      groupId,
      userId,
      groupDuty,
      time: Date.now()
    }


    await db.update('users', modifys, conditions)
    let result = await db.onlyQuery('users', 'id', userId)

    await db.insert('manygroups', manygroupsInsertData)

    let myGrouList = await db.onlyQuery('manygroups', 'userId', userId)
    res.json(util.success({ myGrouList, userInfo: result ? result[0] : result, userIdList }))
  } catch (err) {
    next(err)
  }
})

router.post('/modifyGroup', async (req, res, next) => {
  let { groupLogo, privates, examine, introduce, id, userId, groupName, isModifyGroupName } = req.body
  try {
    let modifys = {
      groupLogo,
      privates,
      examine,
      introduce,
      groupName
    }, conditions = {
      id
    }
    let userInfos = [null]
    if (isModifyGroupName) {
      let queryResult = await db.onlyQuery('groups', 'groupName', groupName)
      if (queryResult.length) return res.send(util.fail('小组名称已存在，请重新修改'))
      await db.update('users', { groupName }, { 'id': userId })
      userInfos = await db.onlyQuery('users', 'id', userId)
    }
    let beforeGroups = await db.onlyQuery('groups', 'id', id)
    if(beforeGroups.length){
      if(beforeGroups[0].groupLogo !== groupLogo) {
        util.deleteFile(beforeGroups[0].groupLogo)
      }
    } 
    let updateResult = await db.update('groups', modifys, conditions)
    let groupInfos = await db.onlyQuery('groups', 'id', id)
    res.send(util.success({ userInfo: userInfos[0], groupInfo: groupInfos[0] }))
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
    id: userId
  }
  try {
    await db.deleteData('manygroups', {
      groupId
    })
    await db.update('users', modifys, conditions)
    let group = await db.onlyQuery('groups', 'id', groupId )
    if(group.length){
      util.deleteFile(group[0].groupLogo)
    }
    let deleteResult = await db.deleteData('groups', { id: groupId })
    res.json(util.success({ result: deleteResult, myGrouList }))
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
  let { pageSize, pageIndex, groupName, minID } = req.query
  try {
    let sql
    if (minID == 0) {
      sql = `SELECT * FROM groups where groupName like '%${groupName}%' and privates = 0 LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    } else {
      sql = `SELECT * FROM groups where groupName like '%${groupName}%' and privates = 0 and  id > ${minID}  LIMIT ${pageSize}`
    }
    let groups = await db.coreQuery(sql)
    res.json(util.success(groups))
  } catch (err) {
    next(err)
  }
})
router.get('/pagingGetSettleGroup', async (req, res, next) => {
  let { pageSize, pageIndex, userId } = req.query
  try {
    let sql = `SELECT t2.*,t1.groupDuty  FROM (select * from manygroups where userId = ${userId} and groupDuty = 0)  AS t1 INNER JOIN groups t2 ON t1.groupId = t2.id ORDER BY t1.id DESC  LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let groups = await db.coreQuery(sql)
    res.json(util.success(groups))
  } catch (err) {
    next(err)
  }
})

router.get('/pagingGetJoinGroup', async (req, res, next) => {
  let { pageSize, pageIndex, userId } = req.query
  try {
    let sql = `SELECT t2.*,t1.groupDuty  FROM (select * from manygroups where userId = ${userId} and (groupDuty = -1 or groupDuty = 1 or groupDuty = 2 ))  AS t1 INNER JOIN groups t2 ON t1.groupId = t2.id ORDER BY t1.id DESC  LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
    let groups = await db.coreQuery(sql)
    res.json(util.success(groups))
  } catch (err) {
    next(err)
  }
})

router.post('/switchGroup', async (req, res, next) => {
  let { groupId, groupName, groupDuty, userId } = req.body
  try {
    let result = await db.multipleQuery('manygroups', { groupId, userId })
    if (!result.length) {
      res.send(util.success(result))
    }
    let modifys = {
      groupId,
      groupName,
      groupDuty: result[0].groupDuty
    }, conditions = {
      id: userId
    }
    let updateResult = await db.update('users', modifys, conditions)
    res.send(util.success(updateResult))
  } catch (err) {
    next(err)
  }

})

router.post('/passiveSwitchGroup', async (req, res, next) => {
  let { userId } = req.body
  try {
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
      id: userId
    }

    let result = await db.update('users', modifys, conditions)
    res.json(util.success(result))
  } catch (err) {
    next(err)
  }

})

router.post('/agreeApply', async (req, res, next) => {
  let {
    userId,
    groupId,
    groupName,
    id,
    msgId,
    myUserId
  } = req.body
  try {
    let modifys = {
      groupDuty: 2,
    },
      conditions = {
        userId,
        groupId
      }
    let groupDutys = await db.multipleQuery('manygroups', conditions, ['groupDuty'])
    if (groupDutys.length && groupDutys[0].groupDuty === -1) {
      db.selfInOrDe('groups', 'member', 'id', groupId, true)
      let updateResult = await db.update('manygroups', modifys, conditions)
      await db.update('users', { groupDuty: modifys.groupDuty, groupId, groupName }, { id: userId })
      let sql1 = `select userId from manygroups where groupId = ${groupId} and (groupDuty = 0 or groupDuty = 1)`
      let userIdList = await db.coreQuery(sql1)
      // userIdList = [{ userId: 47 }]
      updateResult.userIdList = userIdList
      updateResult.isControl = true
      db.update('finalsystem', { status: 1, isNew: 0 }, { id })
      let sql2 = `delete from finalsystem where msgId = ${msgId} and otherId != ${myUserId}`
      db.coreQuery(sql2)
      res.json(util.success(updateResult))
    } else {
      db.update('finalsystem', { status: -1, isNew: 0 }, { id })
      res.json(util.success({ affectedRows: 0 }))
    }
  } catch (err) {
    next(err)
  }
})

router.post('/refuseApply', async (req, res, next) => {
  let {
    userId,
    groupId,
    msgId,
    myUserId,
    id
  } = req.body
  try {
    let groupDutys = await db.multipleQuery('manygroups', { userId, groupId }, ['groupDuty'])
    if (groupDutys.length && groupDutys[0].groupDuty === -1) {
      let deleteResult = await db.deleteData('manygroups', { groupId, userId })
      let groupIds = await db.multipleQuery('users', { id: userId }, ['groupId'])
      if (groupIds[0].groupId === groupId) {
        await db.update('users', { groupDuty: null, groupId: null, groupName: null }, { id: userId })
        deleteResult.isControl = true
      } else {
        deleteResult.isControl = true
      }

      let sql1 = `select userId from manygroups where groupId = ${groupId} and (groupDuty = 0 or groupDuty = 1)`
      let userIdList = await db.coreQuery(sql1)
      //   userIdList = [{ userId: 47 }]
      deleteResult.userIdList = userIdList
      db.update('finalsystem', { status: 2, isNew: 0 }, { id })
      let sql2 = `delete from finalsystem where msgId = ${msgId} and otherId != ${myUserId}`
      db.coreQuery(sql2)
      res.json(util.success(deleteResult))
    } else {
      db.update('finalsystem', { status: -1, isNew: 0 }, { id })
      res.json(util.success({ affectedRows: 0 }))
    }

  } catch (err) {
    next(err)
  }
})
router.get('/newNumber', async (req, res, next) => {
  try {
    groupId = req.query.groupId
    let weekTime = Date.now() - 7 * 24 * 3600 * 1000
    let sql = `select COUNT(*) newNumber  from manygroups where groupId = ${groupId} and time >= ${weekTime} and groupDuty != -1`
    let result = await db.coreQuery(sql)
    res.json(util.success(result[0]))

  } catch (err) {
    next(err)
  }
})

router.get('/getUnlimited', async (req, res, next) => {
  let groupId = req.query.groupId
  let access_token = await accessToken.getAccessToken()
  let url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${access_token}`
  request.post({
    url,
    body: {
      scene: `groupId=${groupId}`,
      "page": 'pages/home/welcome/welcome'
    },
    // request会自动编码成utf8，设置这个base64自动编码成base64
    encoding: 'base64',
    json: true
  }, (err, response, body) => {
    console.log(body, 233333333);
    if (err) return next(err)
    res.json(util.success('data:image/jpeg;base64,' + body))
  })

})
router.get('/simpleGroupInfo', async (req, res, next) => {
  try {
    groupId = req.query.groupId
    let groups = await db.onlyQuery('groups', 'id', groupId)
    res.json(util.success(groups[0]))
  } catch (err) {
    next(err)
  }
})
router.post('/simpleJoinGroup', async (req, res, next) => {
  try {
    let { groupName, userId, groupId } = req.body
    let groupDuty = 2
    let modifys = {
      groupId,
      groupDuty,
      groupName,
    }, conditions = {
      id: userId
    }
    db.selfInOrDe('groups', 'member', 'id', groupId, true)
    let manygroupsInsertData = {
      groupId,
      userId,
      groupDuty,
      time: Date.now()
    }
    await db.update('users', modifys, conditions)
    // let result = await db.onlyQuery('users', 'id', userId)
    await db.insert('manygroups', manygroupsInsertData)
    // let myGrouList = await db.onlyQuery('manygroups', 'userId', userId)
    res.json(util.success('ok'))
  } catch (err) {
    next(err)
  }
})

module.exports = router;

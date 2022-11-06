var mysql = require('mysql');
// 获取数据库配置
var config = require('../config/config').mysql;
var util = require('../util/util')
// 使用连接池
var pool = mysql.createPool(config);
module.exports = {
  /**
  * 获取数据
  * @table   表名
  * @params  参数{k:v}
  * 
  * or       参数:{body:{k:v},page:{no:1,size:10}}
  *          body:参数键值(可以直接传条件字符串：'a>b or c>d')
  *          page:分页对象(no-页码，size-每页显示条数)
  * 
  * @callback
  */
  get: function (table, params, callback) {
    var defaultPage = {
      no: 1,
      size: 10
    }
    var condition = [];
    var body = params.body || params;
    var page = params.page || {};
    page = objectAssign(defaultPage, page);
    var sql = 'select * from ' + table;
    if (Object.prototype.toString.call(body) === '[object Object]') {
      for (var i in body) {
        condition.push(i + '="' + body[i] + '"')
      }
      if (condition.length > 0) {
        sql += ' where ' + condition.join(' and ');
      }
    } else if (Object.prototype.toString.call(body) === '[object String]') {
      sql += ' where ' + body;
    }
    sql += ' order by id desc limit ' + (page.no - 1) * page.size + ',' + page.size;
    //console.log(sql);
    module.exports.commonQuery(sql, callback);
  },
  /**
   * 获得总条数
   * @table   表名
   * @params  参数{k:v}
   *          或者直接是条件字符串： 'weibo=1 and id>2'
   * @callback
   */
  getCount: function (table, params, callback) {
    var sql = 'select count(id) as sum from ' + table;
    var _condition = [];
    if (Object.prototype.toString.call(params) === '[object Object]') {
      for (var i in params) {
        _condition.push(i + '="' + params[i] + '"');
      }
      if (_condition.length > 0) {
        sql += ' where ' + _condition.join(' and ');
      }
    } else if (Object.prototype.toString.call(params) === '[objcet String]') {
      sql += ' where ' + params;
    }
    module.exports.commonQuery(sql, callback);
  },

  /**
   * 修改数据
   * @table   表名
   * @params  参数{body:{k:v},condition{k:v}}
   *          body:       修改键值对
   *          condition:  条件键值对
   * @callback
   */
  // update: function (table, params, callback) {
  //     var body = params.body;
  //     var condition = params.condition;
  //     var body_temp = [];
  //     var condition_temp = [];
  //     for (var i in body) {
  //         body_temp.push(i + '="' + body[i] + '"');
  //     }
  //     for (var j in condition) {
  //         condition_temp.push(j + '="' + condition[j] + '"');
  //     }
  //     if (body_temp.length > 0 && condition_temp.length > 0) {
  //         var sql = 'update ' + table + ' set ' + body_temp.join(',') + ' where ' + condition_temp.join(' and ');
  //         module.exports.commonQuery(sql, callback);
  //     }
  // },
  /**
   * 删除数据
   * @table   表名
   * @params  参数{k:v}
   *          注: 如果是or条件，请直接发送字符串参数 params = 'id=1 or id=2'
   *              或者： params = 'id in (1,2)'
   * @callback
   */
  del: function (table, params, callback) {
    var condition = [];
    var sql = 'delete from ' + table;
    if (Object.prototype.toString.call(params) === '[object Object]') {
      // 如果参数是对象 
      for (var i in params) {
        condition.push(i + '="' + params[i] + '"');
      }
      sql = sql + ' where ' + condition.join(' and ');
    } else if (Object.prototype.toString.call(params) === ['object String']) {
      // 如果参数是字符串
      sql = sql + ' where ' + params;
    }

    module.exports.commonQuery(sql, callback);
  },







  /**
       * 公共查询
       * @sql 
       * @callback
       */
  commonQuery: function (sql, params = [], callback) {
    try {
      pool.getConnection(function (err, connection) {
        if (err) throw err
        console.log("数据库连接成功")
        connection.query(sql, params, function (err, rows) {
          connection.release();
          if (!err) {
            callback && callback(err, rows);
          } else {
            console.log(err);
            callback && callback(err);
          }
        });
      });
    } catch (err) {
      console.log(err);
      console.log('sql有问题', sql);
      callback && callback(err);
    }
  },



  /**
 * 插入数据
 * @table   表名
 * @params  参数{k:v}
 */
  insert (table, params) {
    return new Promise((resolve, reject) => {
      let keys = [], values = [], mark = []
      for (var i in params) {
        keys.push(i);
        values.push(params[i]);
        mark.push('?')
      }
      let sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES(${mark.join(',')})`;

      module.exports.coreQuery(sql, values).then(res => resolve(res)).catch(err => reject(err))
    })
  },
  // 唯一查询
  // 可以返回全部或部分字段
  onlyQuery (table, key, value, some, orderString = "") {
    return new Promise((resolve, reject) => {
      let attributes = []
      attributes = some ? some.join(',') : '*'
      console.log('attributes', attributes)
      let sql = `SELECT ${attributes} FROM ${table} WHERE ${key} = ? ${orderString}`
      let values = [value]
      module.exports.coreQuery(sql, values).then(res => resolve(res)).catch(err => reject(err))
    })
  },
  // 多条件查询
  multipleQuery (table, conditions, some) {
    return new Promise((resolve, reject) => {
      let conditionsKey = [], conditionsValue = [], attributes = []
      attributes = some ? some.join(',') : '*'
      for (let key in conditions) {
        conditionsKey.push(key + '= ?')
        conditionsValue.push(conditions[key])
      }
      let sql = `SELECT ${attributes} FROM ${table} WHERE ${conditionsKey.join(' and ')}`
      let sqlParams = [...conditionsValue]
      module.exports.coreQuery(sql, sqlParams).then(res => resolve(res)).catch(err => reject(err))
    })
  },
  // 修改值
  update (table, modifys, conditions) {
    return new Promise((resolve, reject) => {
      let modifyKey = [], modifyValue = []
      let conditionsKey = [], conditionsValue = []
      for (let key in modifys) {
        modifyKey.push(key + '= ?')
        modifyValue.push(modifys[key])
      }
      for (let key in conditions) {
        conditionsKey.push(key + '= ?')
        conditionsValue.push(conditions[key])
      }
      let sql = `UPDATE ${table} SET ${modifyKey.join(',')} WHERE ${conditionsKey.join(' and ')}`;
      let sqlParams = [...modifyValue, ...conditionsValue]
      module.exports.coreQuery(sql, sqlParams).then(res => resolve(res)).catch(err => reject(err))
    })
  },
  // 通过id进行自增或者自减
  selfInOrDe (table, modify, key, value, operation) {
    return new Promise((resolve, reject) => {
      operation ? operation = '+' : operation = '-'
      let sql = `UPDATE ${table} SET ${modify}=${modify}${operation}1 WHERE ${key} = ?`
      let values = [value]
      module.exports.coreQuery(sql, values).then(res => resolve(res)).catch(err => reject(err))
    })
  },
  // 模糊查询
  // vague(table, key, value, some) {
  //     return new Promise((resolve, reject) => {
  //         let attributes = []
  //         attributes = some ? some.join(',') : '*'
  //         let sql = `select ${attributes} from ${table} where ${key} like '%${value}%'`
  //         module.exports.coreQuery(sql).then(res => resolve(res)).catch(err => reject(err))
  //     })
  // },
  // 模糊查询
  vague (table, key, value, pageSize, pageIndex, order, some) {
    return new Promise((resolve, reject) => {
      let attributes = []
      attributes = some ? some.join(',') : '*'
      let sql = `select ${attributes} from ${table} where ${key} like '%${value}%' ORDER BY ${order.join(',')} LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
      module.exports.coreQuery(sql).then(res => resolve(res)).catch(err => reject(err))
    })
  },
  // 分页查询
  paging (table, pageSize, pageIndex, conditions, order, some) {
    return new Promise((resolve, reject) => {
      let attributes = [], conditionsKey = [], conditionsValue = []
      let where = 'where'
      attributes = some ? some.join(',') : '*'
      for (let key in conditions) {
        conditionsKey.push(key + '= ?')
        conditionsValue.push(conditions[key])

      }
      if (Object.keys(conditions).length === 0) {
        where = ''
      }
      let sql = `select ${attributes} from ${table} ${where} ${conditionsKey.join(' and ')} ORDER BY ${order.join(',')} LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
      let sqlParams = [...conditionsValue]
      module.exports.coreQuery(sql, sqlParams).then(res => resolve(res)).catch(err => reject(err))
    })
  },
  // 多或查询
  orQuery (table, key, conditions, order, some) {
    return new Promise((resolve, reject) => {
      let attributes = [], conditionsKey = []
      attributes = some ? some.join(',') : '*'
      conditions.forEach(() => {
        conditionsKey.push(`${key} = ?`)
      })
      // for (let key in conditions) {
      //     conditionsKey.push(key + ' = ?')
      //     conditionsValue.push(conditions[key])
      // }
      let sql = `select ${attributes} from ${table} where ${conditionsKey.join(' or ')} ORDER BY ${order.join(',')}`
      let sqlParams = conditions
      module.exports.coreQuery(sql, sqlParams).then(res => resolve(res)).catch(err => reject(err))
    })
  },
  // 删除
  deleteData (table, conditions) {
    let conditionsKey = [], conditionsValue = []
    for (let key in conditions) {
      conditionsKey.push(key + '= ?')
      conditionsValue.push(conditions[key])

    }
    return new Promise((resolve, reject) => {
      let sql = `DELETE FROM ${table} WHERE ${conditionsKey.join(' and ')} `
      let sqlParams = [...conditionsValue]
      module.exports.coreQuery(sql, sqlParams).then(res => resolve(res)).catch(err => reject(err))
    })
  },

  //  核心查询
  coreQuery: function (sql, params = []) {
    console.log('coreQuery:', 'sql=', sql, 'params=', params)
    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) return reject(err)
        console.log("数据库连接成功")
        connection.query(sql, params, (err, rows) => {
          connection.release();
          console.log('err', err, 'rows', rows)
          if (err) {
            reject(err)
          } else {
            resolve(rows)
          }
        })
      })
    })
  },
  // 点赞、收藏、关注封装
  // data {
  //     mainTable : {name:'groups',modify:'fansNumber',id:groupId},
  //     viceTable: {name:'groupsfollow',relation:{userId,groupId}},
  // }
  operateLSF: function (data, insertCallback, deleteCallback) {
    let { mainTable, viceTable, operate } = data
    return new Promise(async (resolve, reject) => {
      try {
        let queryResult = await module.exports.multipleQuery(viceTable.name, viceTable.relation)
        if (queryResult.length) {
          // 有数据进行删除操作,但是需要operate为false
          if (!operate) {
            let queryId = queryResult[0].id
            await module.exports.deleteData(viceTable.name, { id: queryId })
            mainTable && await module.exports.selfInOrDe(mainTable.name, mainTable.modify, 'id', mainTable.id, false)
            deleteCallback && await deleteCallback()
            resolve({ operate, modify: true })
          } else {
            resolve({ operate, modify: false })
          }
        } else {
          // 没有数据进行添加操作,但是需要operate为true
          if (operate) {
            await module.exports.insert(viceTable.name, viceTable.relation)
            mainTable && await module.exports.selfInOrDe(mainTable.name, mainTable.modify, 'id', mainTable.id, true)
            insertCallback && await insertCallback()
            resolve({ operate, modify: true })
          } else {
            resolve({ operate, modify: false })
          }

        }
      } catch (err) {
        reject(err)
      }
    })
  },
  // 评论查询封装
  queryComment: function (pageSize, pageIndex, theme, themeId) {
    return new Promise(async (resolve, reject) => {
      try {
        let sql = `SELECT t1.id,t1.theme,t1.themeId,t1.commenterId,t1.commentContent,t1.releaseTime,t2.nickName commenterName,t2.avatarUrl commenterAvatar from (select * from comment where themeId=${themeId} and theme='${theme}')  AS t1 INNER JOIN users t2 ON t1.commenterId = t2.id ORDER BY t1.id DESC LIMIT ${pageSize} OFFSET ${pageSize * (pageIndex - 1)}`
        let commentArr = await module.exports.coreQuery(sql)

        // let commentArr = await module.exports.paging('comment', pageSize, pageIndex, { theme, themeId, }, ['id DESC'])
        let p = Promise.resolve()
        let replyArr = []
        console.log(commentArr)
        if (!commentArr.length) {
          return resolve(commentArr)
        }
        commentArr.forEach((comment, index) => {
          // let sql = `SELECT t3.* ,t4.nickName parentName,t4.avatarUrl parentAvatar from (SELECT t1.id,t1.commentId,t1.parentReplyId,t1.replyPersonId,t1.replyContent,t1.releaseTime,t2.nickName replyPersonName,t2.avatarUrl replyPersonAvatar from (select * from reply where commentId=${comment.id})  AS t1 INNER JOIN users t2 ON t1.replyPersonId = t2.id) AS t3 left JOIN users t4 ON t3.parentReplyId = t4.id ORDER BY t3.id DESC`
          let sql = `SELECT t3.* ,t4.nickName parentName,t4.avatarUrl parentAvatar from (SELECT t1.id,t1.commentId,t1.parentReplyId,t1.replyPersonId,t1.replyContent,t1.releaseTime,t2.nickName replyPersonName,t2.avatarUrl replyPersonAvatar from (select * from reply where commentId=${comment.id})  AS t1 INNER JOIN users t2 ON t1.replyPersonId = t2.id) AS t3 left JOIN users t4 ON t3.parentReplyId = t4.id `
          // let commentArr = module.exports.coreQuery(sql)
          // p = p.then(() => module.exports.onlyQuery('reply', 'commentId', comment.id, false, 'ORDER BY id DESC')).then(result => {
          p = p.then(() => module.exports.coreQuery(sql)).then(result => {
            result.forEach(item => {
              item.releaseTime = util.getDateDiff(item.releaseTime)
            })
            comment.replyArr = result
            comment.releaseTime = util.getDateDiff(comment.releaseTime)
            if (index == commentArr.length - 1) {
              resolve(commentArr)
            }
            return
          })
        })
      } catch (err) {
        reject(err)
      }
    })
  },
  // 查询点赞
  isLike: function (arr, table, userId, themeId, callback) {
    return new Promise((resolve, reject) => {
      if (!arr.length) resolve([])
      let p = Promise.resolve()
      arr.forEach((element, index) => {
        // 对每一条数据进行加工
        callback && (element = callback(element) ? callback(element) : element)
        p = p.then(() => module.exports.multipleQuery(table, { [themeId]: element.id, userId })).then(result => {
          result.length ? element.isLike = true : element.isLike = false
          if (index == arr.length - 1) {
            resolve(arr)
          }
          return
        })
      })
    })
  },
  // 查询收藏
  isStore: function (arr, table, userId, themeId, callback) {
    return new Promise((resolve, reject) => {
      if (!arr.length) resolve([])
      let p = Promise.resolve()
      arr.forEach((element, index) => {

        p = p.then(() => module.exports.multipleQuery(table, { [themeId]: element.id, userId })).then(result => {
          callback && (element = callback(element) ? callback(element) : element)
          result.length ? element.isStore = true : element.isStore = false
          if (index == arr.length - 1) {
            resolve(arr)
          }
          return
        })
      })
    })

  },
  // 查询关注
  isFollow: function (arr, table, userId, themeId, callback) {
    return new Promise((resolve, reject) => {
      if (!arr.length) resolve([])
      let p = Promise.resolve()
      arr.forEach((element, index) => {
        p = p.then(() => module.exports.multipleQuery(table, { [themeId]: element.id, userId })).then(result => {
          callback && (element = callback(element) ? callback(element) : element)
          result.length ? element.isFollow = true : element.isFollow = false
          if (index == arr.length - 1) {
            resolve(arr)
          }
          return
        })
      })
    })

  },
  // 根据数组id查询某个表的数据
  arrIdQuery: function (arr, table, FKID, callback, some) {
    return new Promise((resolve, reject) => {
      let newArr = []
      let p = Promise.resolve()
      // forEach用async就变成异步了
      arr.forEach((element, index) => {
        p = p.then(() => module.exports.onlyQuery(table, 'id', element[FKID], some)).then(result => {
          // 对每一条数据进行加工
          callback && (result[0] = callback(result[0]) ? callback(result[0]) : result[0])
          // result[0].isFollow = true
          newArr.push(result[0])
          if (index == arr.length - 1) {
            resolve(newArr)
          }
          return
        })
      })
    })
  }
}
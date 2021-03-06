var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
let request = require('request');
var logger = require('morgan');
// 引入数据库操作
var db = require('./db/db');


const jwt = require("jsonwebtoken")
//撒盐，加密时候混淆
const secret = '113Bmongojsdalkfnxcvmas'

var index = require('./routes/index');
var usersRouter = require('./routes/users');
var groupRouter = require('./routes/group');
var uploadRouter = require('./routes/upload');
var groupdynamics = require('./routes/groupdynamics');
var groupcard = require('./routes/groupcard');
var groupcardrecord = require('./routes/groupcardrecord');
var groupcourse = require('./routes/groupcourse');
var band = require('./routes/band');
var comment = require('./routes/comment');
var squaredynamics = require('./routes/squaredynamics');
var alliance = require('./routes/alliance');
var second = require('./routes/second');
var ticket = require('./routes/ticket');
var song = require('./routes/song');
var inform = require('./routes/inform');
var system = require('./routes/system');
var performance = require('./routes/performance');
var tap = require('./routes/tap');
let handleToken = require('./util/handleToken')
let svg = require('./routes/svg')
let security = require('./routes/security')

let wx = require('./config/config').wx
// 获取access_token
let accessToken = require('./util/access_token')
accessToken.start()


const schedule = require('node-schedule');
const scheduleCronstyle = () => {
  //每天的0点定时执行一次:
  schedule.scheduleJob('0 0 0 * * *', () => {
    console.log('scheduleCronstyle:' + new Date());
    let sql = "UPDATE users SET isSignIn=0 where id < 100000"
    db.coreQuery(sql)
  });
}
scheduleCronstyle();

var app = express();




// view engine setup
app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// 路径中不用加public
// app.use(express.static(path.join(__dirname, 'public')));

app.use(express.static(path.join(__dirname, 'public')));

// 后台部分
var bc_usersRouter = require('./backRouters/bc_usersRouter');
var bc_index = require('./backRouters/bc_index');
app.use('/back/', bc_index)
app.use('/back/user', bc_usersRouter);

// 验证token
app.use((req, res, next) => {
  console.log(req.url)
  console.log(req.url.includes(handleToken.whiteList), handleToken.whiteList)
  if (!req.url.includes(handleToken.whiteList)) {
    handleToken.verifyToken(req.headers.token).then(res => {
      next()
    }).catch(e => {
      res.send({
        code: -2,
        message: 'invalid token'
      })
    })
  } else {
    next()
  }
})


app.use('/api/user', usersRouter);
app.use('/api', security);
app.use('/api/group', groupRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/groupdynamics', groupdynamics);
app.use('/api/groupcard', groupcard);
app.use('/api/groupcardrecord', groupcardrecord);
app.use('/api/groupcourse', groupcourse);
app.use('/api/band', band);
app.use('/api/comment', comment);
app.use('/api/index', index);
app.use('/api/squaredynamics', squaredynamics);
app.use('/api/alliance', alliance);
app.use('/api/second', second);
app.use('/api/ticket', ticket);
app.use('/api/song', song);
app.use('/api/inform', inform);
app.use('/api/system', system);
app.use('/api/performance', performance);
app.use('/api/tap', tap);
app.use('/api/svg', svg);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  // 找不到的路径都会进过这里
  next(createError(404));
  // var err = new Error('Not Found');
  // err.status = 404;
  // next(err);
});

// error handler
app.use(function (err, req, res, next) {
  console.log(err)
  if (!err) {
    err = '没有响应'
  }
  // 错误总处理
  res.status(err.status || 500);
  res.json({ message: JSON.stringify(err), code: -1, status: err.status || 500 })

});

module.exports = app;

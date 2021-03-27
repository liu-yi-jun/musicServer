var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')
var multer = require('multer')
var fs = require("fs");
var baseUrl = require('../config/config').resource.baseUrl;
let accessToken = require('../util/access_token')
let request = require('request');

// destination 如果是一个函数，则下面的路径必须是已经存在的路径，否则汇报错误：路径不存在
let storage = multer.diskStorage({
  //设置上传后文件路径，uploads文件夹会自动创建。
  destination: function (req, file, cb) {
    let { userId = 'unknown', module = 'unknown', type = 'unknown' } = req.body
    fs.mkdir(__dirname + `/../public/${type}/ID00${userId}/${module}/`, { recursive: true }, function (err) {
      if (err) {
        return console.error(err);
      }
      console.log("目录创建成功。");
      cb(null, __dirname + `/../public/${type}/ID00${userId}/${module}/`)
    });

  },
  //给上传文件重命名，获取添加后缀名
  filename: function (req, file, cb) {
    let fileFormat = (file.originalname).split(".");
    let filename = Date.now() + "." + fileFormat[fileFormat.length - 1]
    cb(null, filename);
  }
});
let upload = multer({
  storage: storage
});


router.post('/uploadImg', upload.single('file'), async (req, res, next) => {
  let { userId = 'unknown', module = 'unknown', type = 'unknown' } = req.body
  var url = `${baseUrl}/${type}/ID00${userId}/${module}/` + req.file.filename
  let form = {
    media: fs.createReadStream(__dirname + `/../public/${type}/ID00${userId}/${module}/${req.file.filename}`)
  }
  let access_token = await accessToken.getAccessToken()
  if (type === 'image') {
    let reqUrl = `https://api.weixin.qq.com/wxa/img_sec_check?access_token=${access_token}`
    request.post({ url: reqUrl, formData: form }, (err, response, body) => {
      body = JSON.parse(body)
      if (body.errcode) {
        fs.unlinkSync(__dirname + `/../public/${type}/ID00${userId}/${module}/${req.file.filename}`);
        next('内容含有违法违规内容')
      } else {
        res.json(util.success(url))
      }
    })
  } else if (type === 'voice') {
    let reqUrl = `https://api.weixin.qq.com/wxa/media_check_async?access_token=${access_token}`
    request.post({
      url: reqUrl,
      body: {
        media_url: url,
        media_type: 1
      },
      json: true
    }, (err, response, body) => {
      if (body.errcode) {
        fs.unlinkSync(__dirname + `/../public/${type}/ID00${userId}/${module}/${req.file.filename}`);
        console.log('内容含有违法违规内容')
      } else {
        res.json(util.success(url))
      }
    })
  } else {
    res.json(util.success(url))
  }

})


module.exports = router;

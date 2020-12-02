var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')
var multer=require('multer')
var fs = require("fs");
var baseUrl = require('../config/config').resource.baseUrl;

// destination 如果是一个函数，则下面的路径必须是已经存在的路径，否则汇报错误：路径不存在
let storage = multer.diskStorage({
    //设置上传后文件路径，uploads文件夹会自动创建。
    destination: function (req, file, cb) {
        let {userId='unknown', module='unknown', type = 'unknown'} =  req.body
        // cb(null,  __dirname + '../public')
        // cb(null,  '/my/musicServer/public')
        fs.mkdir( __dirname + `/../public/${type}/ID00${userId}/${module}/`,{ recursive: true },function(err){
            if (err) {
                return console.error(err);
            }
            console.log("目录创建成功。");
            cb(null,  __dirname + `/../public/${type}/ID00${userId}/${module}/`)
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


router.post('/uploadImg', upload.single('file'), (req, res, next) => {
    let {userId='unknown', module='unknown', type = 'unknown'} =  req.body
    var url = `${baseUrl}/${type}/ID00${userId}/${module}/` + req.file.filename
    // var url = `${baseUrl}/` + req.file.filename
    // console.log(11111111111111111111111)
    res.json(util.success(url))
})


module.exports = router;

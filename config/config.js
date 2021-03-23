const { resource } = require("../app");

module.exports = {
    mysql: {
        host: 'www.shengruo.top',
        // host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'music',
        port: 3306
    },
    wx: {
        // 旧
        // appId: 'wxa158839a69c014d3',
        // appSecret: 'a85bda6211717ca95cfe57501ba20a71'
        // 新
        appId: 'wxf38d23a046de6205',
        appSecret: '65e058e60a0f5e7c737426022a0b2dc2'
      
    },
    resource: {
        baseUrl:'https://www.shengruo.top'
        // baseUrl:"https://eigene.cn"
        // baseUrl:"http://eigene.free.idcfengye.com"
    }
}
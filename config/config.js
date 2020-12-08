const { resource } = require("../app");

module.exports = {
    mysql: {
        host: 'localhost',
        // host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'music',
        port: 3306
    },
    wx: {
        appId: 'wxa158839a69c014d3',
        appSecret: 'a85bda6211717ca95cfe57501ba20a71'
    },
    resource: {
        // baseUrl:'http://localhost:3000'
        baseUrl:"http://eigene.cn:3000"
        // baseUrl:"http://eigene.free.idcfengye.com"
    }
}
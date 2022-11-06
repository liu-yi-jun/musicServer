const { resource } = require("../app");

module.exports = {
  mysql: {
    host: 'www.shengruo.top',
    // host: 'localhost',
    user: 'eigene',
    // password: 'QFJP46zm',
    password: 'QFJP46zm',
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
  mp: {
    token: 'test',
    appId: 'wxab1b3884679a9fe5',
    appSecret: '09eedbe028367092c3af0d09af071ba7'
  },
  resource: {
    baseUrl: "http://localhost:3000"
    // baseUrl: "http://192.168.31.40:3000"
    // baseUrl: "http://192.168.0.145:3000"
    // baseUrl: 'https://www.shengruo.top'
    // baseUrl:"https://eigene.cn"
    // baseUrl:"http://eigene.free.idcfengye.com"
  },
  InfoId: {
    like: 'b_JFxHhkQlp9nvVXyH2EE02YIH2U6kUj71UqsspyFM8',
    content: 'gSZolmS3oikRODqlJy0LGyrWtJgRZv2wV05CZBmW8ko',
    reply: 'OhXH6fGsvmuAQGzrTBZYnggUlasZfqBjd0xzFvgZtjI',
    band: 'm1ULncMbn3rDVirXA_2-EoLHtmRWSsVc3Fg8NlCWW_s',
    joinGroup: 'gVM-0N8z4sipyh4riEaEUrSuRVusfgsfk6U3DrDV_-w',
    examine: 'HDFi5dRAZ-sWt-J7LJ6OR59Oc3hgAqtOTqyfosR3qX4',
    forward: '-G-UDwc7TcN9fqymhEOQVyRKabgx0nt4M8BmW0BHSsA',
    signIn: "Ca_xIYFYmajur3jRrlxqATJlBmA-Z1E8pu9IlyvLnIo",
    follow: "FK_z03HLwu5lAtmwPxXd0wd81owIbs077fD0kVtpAec"
  }
}
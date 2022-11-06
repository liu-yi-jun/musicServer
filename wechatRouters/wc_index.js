var express = require('express');
var router = express.Router();
var url = require('url');
var qs = require('qs');
var cy = require('crypto');
let mp = require('../config/config').mp
let request = require('request');
var fxp = require('fast-xml-parser');
const mpAccess_token = require('../util/mpAccess_token')
const menu = require('./js/menu')
const db = require('../db/db')
const fs = require('fs')


//这个是验证签名，公众号后台配置路由的时候用的，公众号配置服务器路由的时候会发送 get 请求到这个接口 接口进行 sha1 加密并验证就行了
router.get('/', function (req, res, next) {
  console.log(req.query);
  let query = url.parse(req.url).query;
  let params = qs.parse(query);

  if (!checkSignature(params, mp.token)) {
    //如果签名不对，结束请求并返回
    res.end('signature fail');
  } else {
    res.end(params.echostr);
  }
});
function checkSignature (params, token) {
  let key = [token, params.timestamp, params.nonce].sort().join('');

  let sha1 = cy.createHash('sha1');

  sha1.update(key);

  //将加密后的字符串与signature进行对比，若成功，返回echostr
  return sha1.digest('hex') == params.signature;
}

//这是验证之后其他的事件都走的 post 同样的接口，只是接收方式和接收到的东西不同罢了，分开写没毛病 老铁们~
router.post('/', function (req, res, next) {
  let postdata = ''; //预定义一个变量用来接收 post 过来的 xml 字符串
  req.addListener("data", function (postchunk) {
    postdata += postchunk;
  });
  //获取到了 post 的 xml 数据
  req.addListener("end", async function () {
    let str = await checkMsg(postdata); //检查到底是什么类型的消息，分 event 和 其他类型 ，并根据消息类型返回不同的消息
    res.end(str);
  });
})

//将接收到的 xml 字符串传递过来并解析成 json 方便调用
function checkMsg (xmlStr) {
  return new Promise(async (resolve, reject) => {
    let formatMsg = fxp.parse(xmlStr).xml;
    let resStr = ""; //预定义的返回值消息
    if (formatMsg.MsgType == "event") {
      resStr = await eventMsg({ event: formatMsg.Event, formatMsg });
    } else {
      resStr = await otherMsg({ MsgType: formatMsg.MsgType, formatMsg })
    }
    return resolve(resStr);
  })

}

//event 事件类型处理函数
function eventMsg ({ event, formatMsg }) {
  console.log('event 事件', event, formatMsg);
  return new Promise(async (resolve, reject) => {
    let resStr = '';
    switch (event) {
      case "subscribe": //关注公众号回复的第一条消息

        // 自定义菜单
        await createMenu()
        resStr = Text(formatMsg.FromUserName, formatMsg.ToUserName, '您好，欢迎关注声若文化!')
        break;
      case "unsubscribe": //取消关注直接回复成功就OK了，也可以真如手册上说的，去数据库里面把用户相关信息删掉，不过不知道有没有人会干这事儿
        resStr = 'success';
        break;
      case "CLICK":
        if (formatMsg.EventKey === 'about') {
          //       resStr = Text(formatMsg.FromUserName, formatMsg.ToUserName, `    互联网浪潮下，人与人之间的联系越来越紧密，生活变得屏幕化、碎片化。但是紧密的联系逐渐停留在表层。我们希望从“音乐”为切入点寻找人们内心深处的契合与联系。

          // Music Monster希望用音乐连接用户， 让音乐融入生活，让音乐创造价值，让音乐产生更多可能。

          // 基于音乐，但是不止音乐，我们希望和您一起产生更多有趣有价值的内容，共同守护这个小小的音乐乌托邦~`);

          // let mdeia_id = await uploadFile('cooperation.jpg')

          resStr = Img(formatMsg.FromUserName, formatMsg.ToUserName, 'ZRZVQhDZNbmlt6Dos50swp6XanmcpPoD5KVvfnStksI')


        } else if (formatMsg.EventKey === 'join') {
    //       resStr = Text(formatMsg.FromUserName, formatMsg.ToUserName, `如果你：

    // 1、对音乐文化有独特的见解，对音乐内容的运营有创造性的思考，欢迎加入我们，开启你的音乐“实验”之旅
          
    // 2、既是Programmer，又是Musician，欢迎加入我们，Coding Your Musical Life！
          
    // 3、有组织经验，擅长筹备一些活动（线上线下音乐讲座、小型音乐会），欢迎加入我们，一同普及音乐文化，让音乐疗愈更多的灵魂~
          
    // Email：shengruohz@163.com`);
    resStr = Img(formatMsg.FromUserName, formatMsg.ToUserName, 'ZRZVQhDZNbmlt6Dos50swiMPd2KBeb0Gm20v4HekdcM')
        } else if (formatMsg.EventKey === 'cooperate') {
          // resStr = Text(formatMsg.FromUserName, formatMsg.ToUserName, '商务合作及内容投稿请添加工作人员（请注明事由）VX: shengruohz');
          resStr = Img(formatMsg.FromUserName, formatMsg.ToUserName, 'ZRZVQhDZNbmlt6Dos50swqLfPK77vY4_aiqTJTSdnK0')
          
        } else {
          resStr = Text(formatMsg.FromUserName, formatMsg.ToUserName, '很抱歉，暂无此功能');
        }
        break;
      default:
        resStr = 'success';
    }
    return resolve(resStr);
  })
}

//other 事件类型处理函数，比如在公众号页面直接输入文字给公众号发送消息，走的就是 other 类型
function otherMsg ({ MsgType, formatMsg }) {
  console.log('other 事件', MsgType, formatMsg);
  return new Promise(async (resolve, reject) => {
    let answer = "";
    switch (MsgType) {
      case "text": //这里可以使用正则做一个模糊查询来确定回复的消息到底是啥，暂时直接写死了
        if (formatMsg.Content == '1') {
          console.log('openid =', formatMsg.FromUserName, '开发者微信号', formatMsg.ToUserName);
          // let userInfo = await getUserInfo(formatMsg.FromUserName)
          // console.log(userInfo, 222222);
          // userInfo = JSON.parse(userInfo)
          // if (!userInfo.subscribe) {
          //   answer = '需要先关注公众号才能申请邀请码哦！'
          // } else {
          // 用户的unionid，检查数据库（unionid）是否存在
          // 存在：生成邀请码，将邀请码与unionID存入表中，不存在：返回提示您暂未成为musicMonster小程序用户，无法为您提供邀请码
          let flag = true
          global.applicants.forEach(item => {
            if (item === formatMsg.FromUserName) {
              flag = false
              return
            }
          })
          console.log('邀请码=', global.codes, '人员列表=', global.applicants);
          if (flag) {
            let result = await db.onlyQuery('invitationcode', 'id', 1)
            if (result[0].sum) {
              // 可以正常申请
              let code = createCode()
              answer = code
              global.codes.push(code)
              global.applicants.push(formatMsg.FromUserName)
              db.selfInOrDe('invitationcode', 'sum', 'id', 1, false)
            } else {
              // 邀请码完
              answer = '对不起，本轮邀请码已发放结束，如需继续申请，请发送申请理由至后台，审核通过后将发放专属邀请码～'
            }

          } else {
            answer = '您今天已申请过邀请码，请明天再尝试！'
          }

          // }
        } else {
          answer = '请耐心等候，客服人员接入后将第一时间为您解答！';
        }
        break;
      default:
        answer = "请耐心等候，客服人员接入后将第一时间为您解答！";
    }
    resStr = Text(formatMsg.FromUserName, formatMsg.ToUserName, answer)
    return resolve(resStr);
  })


}

function Text (FromUserName, ToUserName, answer) {
  return `<xml>
  <ToUserName><![CDATA[${FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${ToUserName}]]></FromUserName>
  <CreateTime>${new Date().getTime()}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${answer}]]></Content>
</xml>`;
}

function Img (FromUserName, ToUserName, media_id) {
  return `<xml>
  <ToUserName><![CDATA[${FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${ToUserName}]]></FromUserName>
  <CreateTime>${new Date().getTime()}</CreateTime>
  <MsgType><![CDATA[image]]></MsgType>
  <Image>
    <MediaId><![CDATA[${media_id}]]></MediaId>
  </Image>
</xml>
`
}

async function getUserInfo (openid) {
  let token = await mpAccess_token.getAccessToken()
  let url = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${token}&openid=${openid}&lang=zh_CN`
  return new Promise((resolve, reject) => {
    request(url, (err, response, body) => {
      if (err) return reject(err)
      resolve(body)
    })
  })
}


//上传素材
async function uploadFile (urlPath) {
  var that = this;
  return new Promise(async function  (resolve, reject) {
    let token = await mpAccess_token.getAccessToken()

    //data=== access_token
    var form = { //构造表单
      media: fs.createReadStream(__dirname + `/../public/source/${urlPath}`)
    }

    var url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`

    // that.requestPost(url, form).then(function (result) {
    //   resolve(JSON.parse(result).media_id);
    // })

    request.post({ url, formData: form }, (err, response, result) => {
      console.log(result);
      resolve(JSON.parse(result).media_id);
    })

  })
}


async function createMenu () {
  let token = await mpAccess_token.getAccessToken()
  return new Promise((resolve, reject) => {
    request({
      method: 'POST',
      url: `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${token}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      form: JSON.stringify(menu.btn)
    },
      (error, response, body) => {
        if (!error && response.statusCode == 200) {
          console.log(body);
          return resolve(body)
        } else {
          return resolve('error')
        }
      }
    )
  })
}

function createCode () {
  code = "";
  var codeLength = 6; //验证码的长度
  var codeChars = new Array(0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'); //所有候选组成验证码的字符，当然也可以用中文的
  for (var i = 0; i < codeLength; i++) {
    var charNum = Math.floor(Math.random() * 52);
    code += codeChars[charNum];
  }

  global.codes.forEach((item) => {
    if (item === code) {
      return createCode()
    }
  })
  return code
}

module.exports = router;
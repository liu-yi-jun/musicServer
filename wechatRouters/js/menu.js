module.exports = {
  btn: {
    "button": [
      //   {  //一级菜单
      //   "type": "click",
      //   "name": "邀请码",
      //   "key": "V1000_invitation"
      // },
      {
        "name": "音乐工具",
        "sub_button": [
          {
            "type": "miniprogram",
            "name": "调音器",
            "url": "http://mp.weixin.qq.com",
            "appid": "wxf38d23a046de6205",
            "pagepath": "pages/tool/tool?mp=true&type=analysis"
          },
          {
            "type": "miniprogram",
            "name": "和弦库",
            "url": "http://mp.weixin.qq.com",
            "appid": "wxf38d23a046de6205",
            "pagepath": "pages/tool/tool?mp=true&type=chord"
          }
        ]
      },
      {
        "type": "miniprogram",
        "name": "小程序",
        "url": "http://mp.weixin.qq.com",
        "appid": "wxf38d23a046de6205",
        "pagepath": "pages/home/home"
      },
      {
        "name": "发现更多",
        "sub_button": [
          {
            "type": "view",
            "name": "往期回顾",
            "url": "https://mp.weixin.qq.com/s?__biz=Mzg2MTU4NzM3Ng==&mid=2247483689&idx=1&sn=9e32c93932866e2202a0015c08fdc137&chksm=ce1593f6f9621ae084854a2c5187d9d6f96587a33cde3dd88bc2aaa2879d263e85f16e8511cb&token=2116579650&lang=zh_CN#rd"
          },
          {
            "type": "click",
            "name": "关于我们",
            "key": "about"
          },
          {
            "type": "click",
            "name": "加入我们",
            "key": "join"
          },
          {
            "type": "click",
            "name": "投稿&合作",
            "key": "cooperate"
          }]
      }
    ]
  }
}
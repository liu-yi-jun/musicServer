/**
 * 公共函数定义
 */
let createHash = require('create-hash');
module.exports = {
  // 生成随机数
  createNonceStr() {
    return Math.random().toString(36).substr(2, 15);
  },
  // 生成时间戳
  createTimeStamp() {
    return parseInt(new Date().getTime() / 1000) + ''
  },
  // 生成签名
  getSign(params, key) {
    let string = this.raw(params) + '&key=' + key;
    let sign = createHash('md5').update(string).digest('hex');
    return sign.toUpperCase();
  },
  // 生成系统的交易订单号
  getTradeId(type = 'wx') {
    let date = new Date().getTime().toString();
    let text = '';
    let possible = '0123456789';
    for (let i = 0; i < 5; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return (type == 'wx' ? 'ImoocWxJuZi' : 'ImoocMpJuZi') + date + text;
  },
  // Object 转换成json并排序
  raw(args) {
    let keys = Object.keys(args).sort();
    let obj = {};
    keys.forEach((key) => {
      obj[key] = args[key];
    })
    // {a:1,b:2} =>  &a=1&b=2
    // 将对象转换为&分割的参数
    let val = '';
    for (let k in obj) {
      val += '&' + k + '=' + obj[k];
    }
    return val.substr(1);
  },
  // 对请求结果统一封装处理
  // handleResponse(err, response, body){
  //   if (!err && response.statusCode == '200') {
  //     let data = JSON.parse(body);
  //     if (data && !data.errcode){
  //       return this.success(data);
  //     }else{
  //       return this.fail(data.errmsg);
  //     }
  //   }else {
  //     return this.fail(err);
  //   }
  // },
  add0(m) { return m < 10 ? '0' + m : m },
  format(shijianchuo) {
    //shijianchuo是整数，否则要parseInt转换
    var time = new Date(shijianchuo);
    var y = time.getFullYear();
    var m = time.getMonth() + 1;
    var d = time.getDate();
    // var h = time.getHours();
    // var mm = time.getMinutes();
    // var s = time.getSeconds();
    // return y+'-'+add0(m)+'-'+add0(d)+' '+add0(h)+':'+add0(mm)+':'+add0(s);
    return y + '-' + this.add0(m) + '-' + this.add0(d);
  },
  handleDate(stamp){
    var time = new Date(stamp);
    var y = time.getFullYear();
    var m = time.getMonth() + 1;
    var d = time.getDate();
    var h = time.getHours();
    var mm = time.getMinutes();
    var s = time.getSeconds();
    return `${y}-${this.add0(m)}-${this.add0(d)} ${this.add0(h)}:${this.add0(mm)}`
  },
  success(data = {}, message) {
    return {
      code: 0,
      data,
      message: JSON.stringify(message)
    }
  },
  fail(message = '') {
    return {
      code: -1,
      message: JSON.stringify(message)
    }
  },
  // JS字符串长度判断,超出进行自动截取(支持中文)
  cutstr(str, len) {
    if (!str) return str
    var str_length = 0;
    var str_len = 0;
    var str_cut = new String();
    str_len = str.length;
    for (var i = 0; i < str_len; i++) {
      var a = str.charAt(i);
      str_length++;
      if (escape(a).length > 4) {
        //中文字符的长度经编码之后大于4 
        str_length++;
      }
      str_cut = str_cut.concat(a);
      if (str_length >= len) {
        str_cut = str_cut.concat("...");
        return str_cut;
      }
    }
    //如果给定字符串小于指定长度，则返回源字符串； 
    if (str_length <= len) {
      return str;
    }
  },
  getDateDiff(dateTimeStamp) {
    if (typeof dateTimeStamp === "string") {
      return dateTimeStamp
    }
    var result = ''
    var minute = 1000 * 60;
    var hour = minute * 60;
    var day = hour * 24;
    var halfamonth = day * 15;
    var month = day * 30;
    var now = new Date().getTime();
    var diffValue = now - dateTimeStamp;
    if (diffValue < 0) { return; }
    var monthC = diffValue / month;
    var weekC = diffValue / (7 * day);
    var dayC = diffValue / day;
    var hourC = diffValue / hour;
    var minC = diffValue / minute;
    if (monthC >= 1) {
      result = "" + parseInt(monthC) + "月前";
    }
    else if (weekC >= 1) {
      result = "" + parseInt(weekC) + "周前";
    }
    else if (dayC >= 1) {
      result = "" + parseInt(dayC) + "天前";
    }
    else if (hourC >= 1) {
      result = "" + parseInt(hourC) + "小时前";
    }
    else if (minC >= 1) {
      result = "" + parseInt(minC) + "分钟前";
    } else
      result = "刚刚";
    return result;
  }
}
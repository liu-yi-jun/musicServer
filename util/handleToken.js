
const jwt = require("jsonwebtoken")
//白名单
const whiteList = ['/api/user/getToken']

//撒盐，加密时候混淆
const secret = 'liuyijunMusic'

//生成token
//info也就是payload是需要存入token的信息
function createToken(info) {
    let token = jwt.sign(info, secret, {
        //Token有效时间 单位s
        expiresIn: 60 * 60 * 12
    })
    return token
}


//验证Token
function verifyToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, (error, result) => {
            if (error) {
                reject(error)
            } else {
                resolve(result)
            }
        })
    })
}

module.exports = {
    whiteList: whiteList,
    createToken: createToken,
    verifyToken: verifyToken
}

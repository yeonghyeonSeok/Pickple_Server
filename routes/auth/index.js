var express = require('express');
var router = express.Router();

/*
router.use("/signin", require("./signin")); // 로그인
router.use("/signup", require("./signup")); // 회원가입
router.use("/duplicated", require("./duplicated")); // 중복확인
*/
router.use("/finder", require("./finder")); // 비밀번호 찾기

module.exports = router;
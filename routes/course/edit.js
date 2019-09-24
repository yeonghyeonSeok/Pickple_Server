var express = require('express');
var router = express.Router();

const authUtil = require("../../module/utils/authUtils");   // 토큰 있을 때 사용
const upload = require('../../config/multer');

const defaultRes = require('../../module/utils/utils');
const statusCode = require('../../module/utils/statusCode');
const resMessage = require('../../module/utils/responseMessage')
const db = require('../../module/pool');

/*
코스 등록
METHOD       : POST
URL          : /course/edit
BODY         : courseName = 코스 이름
               description = 코스에 대한 간단한 설명
               course_thumbnail =  코스 썸네일
               placeArray[0] = 장소 인덱스
               distance[0] = 장소 간 거리
               tag[0] = 코스 해시태그
               date = 코스 등록 날짜
               district = 코스의 구역
               type = 코스 구분
               icon = 코스 아이콘
               totalHour = 총 소요시간
*/

router.post('/', upload.single('course_thumbnail'), authUtil.isLoggedin, async (req, res) => {
    const inputUserIdx = req.decoded.userIdx;
    const insertCourseQuery = 'INSERT INTO course (cName, cDescription, cThumbnail, cLikeCount, cType, courseIcon, totalHour, courseDate, cDistrict, userIdx) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const insertCourseResult = await db.queryParam_Arr(insertCourseQuery, [req.body.courseName, req.body.description, req.file.location, 0, req.body.type, req.body.icon, req.body.totalHour, req.body.date, req.body.district, inputUserIdx]);
    const inputCourseIdx = insertCourseResult.insertId;
    
    const insertPlaceArrayQuery = 'INSERT INTO course_place (courseIdx) VALUES (?)' //테이블 수정(course_place 테이블에 placeIdx[0] placeIdx[1], placeIdx[2] ...이런식으로(nullable))
    const insertPlaceArrayResult = await db.queryParam_Parse(insertPlaceArrayQuery, [inputCourseIdx]);

    for(i = 1; i<13; i++) {
        if(req.body.placeArray[i-1] != null) {
            const updatePlaceArrayQuery = 'UPDATE course_place SET place_'+i+' = ? WHERE courseIdx = ?';
            const updatePlaceArrayResult = await db.queryParam_Arr(updatePlaceArrayQuery, [req.body.placeArray[i-1], inputCourseIdx]);
        }
        else {
            break;
        }
    }

    const insertDistanceQuery = 'INSERT INTO distance (courseIdx) VALUES (?)' //테이블 수정(course_place 테이블에 placeIdx[0] placeIdx[1], placeIdx[2] ...이런식으로(nullable))
    const insertDistanceResult = await db.queryParam_Parse(insertDistanceQuery, [inputCourseIdx]);

    for(i = 1; i<12; i++) {
        if(req.body.distance[i-1] != null) {
            const updateDistanceQuery = 'UPDATE distance SET distance_'+i+' = ? WHERE courseIdx = ?';
            const updateDistanceResult = await db.queryParam_Arr(updateDistanceQuery, [req.body.distance[i-1], inputCourseIdx]);
        }
        else {
            break;
        }
    }

    const tagCount = req.body.tag.length;
    //console.log(tagCount);
    for(i = 0; i<tagCount; i++) {
        const selectTagQuery = 'SELECT tagIdx from tag WHERE tagName = ?';
        const selectTagResult = await db.queryParam_Parse(selectTagQuery, [req.body.tag[i]]);
        //console.log(selectTagResult[0]);

        if(selectTagResult[0] != null) {
            const inputTagIdx = selectTagResult[0].tagIdx;
            console.log('태그등록');
            console.log(inputTagIdx);
            const insertCourseTagQuery = 'INSERT INTO course_tag (courseIdx, tagIdx) VALUES(?, ?)'
            const insertCourseTagResult = await db.queryParam_Arr(insertCourseTagQuery, [inputCourseIdx, inputTagIdx]);

            const updateTagQuery = 'UPDATE tag SET tagCount = tagCount + 1 WHERE tagIdx = ?';
            const updateTagResult = await db.queryParam_Parse(updateTagQuery, [inputTagIdx]);
        } else {
            const insertTagQuery = 'INSERT INTO tag (tagName, tagCount) VALUES (?, ?)';
            const insertTagResult = await db.queryParam_Arr(insertTagQuery, [req.body.tag[i], 1]);

            const inputTagIdx = insertTagResult.insertId;
            console.log(inputTagIdx);
            const insertCourseTagQuery = 'INSERT INTO course_tag (courseIdx, tagIdx) VALUES(?, ?)'
            const insertCourseTagResult = await db.queryParam_Arr(insertCourseTagQuery, [inputCourseIdx, inputTagIdx]);
        }
    }

    const updateEditCountQuery = 'UPDATE user SET editCourseCount = editCourseCount + 1 WHERE userIdx = ?';
    const updateEditCountResult = await db.queryParam_Parse(updateEditCountQuery, [inputUserIdx]);

    res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.COURSE_EDIT_SUCCESS));

});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 사용자 코스 삭제
router.delete('/', authUtil.isLoggedin, async (req, res) => {
    const userSelectQuery = "SELECT * FROM user JOIN course ON course.userIdx = user.userIdx WHERE course.courseIdx = ? AND course.userIdx = ?"
    const userSelectResult = await db.queryParam_Arr(userSelectQuery, [req.body.courseIdx, req.decoded.userIdx]);

    const userIdx = userSelectResult[0].userIdx;
    const courseIdx = userSelectResult[0].courseIdx;

    if (!userSelectResult) {
        res.status(200).send(defaultRes.successFalse(statusCode.DB_ERROR, resMessage.DB_ERROR));
    } else {
        if (userSelectResult[0] == null) {
            res.status(200).send(defaultRes.successFalse(statusCode.OK, resMessage.NOT_EXIST_EDIT));    // 사용자 코스가 존재하지 않습니다
        } else {
            const courseDeleteQuery = 'DELETE FROM course WHERE course.courseIdx = ? AND course.userIdx = ?';
            const courseDeleteResult = await db.queryParam_Arr(courseDeleteQuery, [courseIdx, userIdx]);

            const userUpdateQuery = 'UPDATE user SET editCourseCount = editCourseCount - 1 WHERE userIdx =?';
            const userUpdateResult = await db.queryParam_Arr(userUpdateQuery, [userIdx]);
            if (!courseDeleteResult) {
                res.status(200).send(defaultRes.successFalse(statusCode.DB_ERROR, resMessage.DB_ERROR));
            } else {
                res.status(200).send(defaultRes.successTrue(statusCode.OK, resMessage.SUCCESS_DELETE_EDIT));    // 사용자 코스 삭제 성공
            }
        }
    }
});



module.exports = router;
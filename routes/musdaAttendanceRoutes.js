const express = require('express')
const config = require('../config')
const { protect, mainAdmin } = require('../middlewares/authMiddleware')
const musdaAttendanceController = require(`../modules/${config.APP_VERSION}/musdaAttendance/musdaAttendanceController`)

const router = express.Router()
router.route('/download').get(protect, mainAdmin, musdaAttendanceController.download)
router.route('/')
    .get(protect, mainAdmin, musdaAttendanceController.list)
    .post(protect, mainAdmin, musdaAttendanceController.create)
router.route('/:id')
    .put(protect, mainAdmin, musdaAttendanceController.update)
    .delete(protect, mainAdmin, musdaAttendanceController.delete)

module.exports = router

const asyncHandler = require('express-async-handler')
const musdaAttendanceService = require('./musdaAttendanceService')
const eventConstant = require('../../../constants/eventConstant')
const loggerStatusConstant = require('../../../constants/loggerStatusConstant')
const { logger } = require('../../../utils/loggerUtils')
const { paginate } = require('../../../utils/paginationUtils')

const musdaAttendanceController = {}
const message = eventConstant.musdaAttendance

const isId = (value) => /^\d+$/.test(value)

// @desc    list musda attendance of a month (default: current month)
// @route   GET /musda-attendances?month=YYYY-MM&page=&pageSize=
// @access  Protect, Main Admin (PPG)
musdaAttendanceController.list = asyncHandler(async (req, res) => {
    req.event = message.list.event
    const { month, page, pageSize } = req.query
    const result = await musdaAttendanceService.list({ organizationId: req.auth.data.position.orgId, month, page, pageSize })
    const currentPage = Math.max(Number(page) || 1, 1)
    const metadata = paginate({ page: currentPage, pageSize: result.limit, count: result.data.length, totalCount: result.total })
    res.json({ ...metadata, month: result.month, present: result.present, data: result.data })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    add an attendee (name, dapukan, present) to a month's musda
// @route   POST /musda-attendances
// @access  Protect, Main Admin (PPG)
musdaAttendanceController.create = asyncHandler(async (req, res) => {
    req.event = message.create.event
    const { month, name, dapukan, isPresent } = req.body
    const result = await musdaAttendanceService.create(req.auth.data.position.orgId, { month, name, dapukan, isPresent })
    res.status(201).json({ message: 'SUCCESS', id: result.id })
    logger({ req, status: loggerStatusConstant.SUCCESS, statusCode: 201 })
})

// @desc    update an attendee
// @route   PUT /musda-attendances/:id
// @access  Protect, Main Admin (PPG)
musdaAttendanceController.update = asyncHandler(async (req, res) => {
    req.event = message.update.event
    const { name, dapukan, isPresent } = req.body
    await musdaAttendanceService.update(isId(req.params.id) ? req.params.id : 0, req.auth.data.position.orgId, { name, dapukan, isPresent })
    res.json({ message: 'SUCCESS' })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    delete an attendee
// @route   DELETE /musda-attendances/:id
// @access  Protect, Main Admin (PPG)
musdaAttendanceController.delete = asyncHandler(async (req, res) => {
    req.event = message.delete.event
    if (isId(req.params.id)) await musdaAttendanceService.delete(req.params.id, req.auth.data.position.orgId)
    res.json({ id: req.params.id })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    musda attendance of a month as excel
// @route   GET /musda-attendances/download?month=YYYY-MM
// @access  Protect, Main Admin (PPG)
musdaAttendanceController.download = asyncHandler(async (req, res) => {
    req.event = message.download.event
    const { buffer } = await musdaAttendanceService.export({ organizationId: req.auth.data.position.orgId, month: req.query.month })
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(Buffer.from(buffer))
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

module.exports = musdaAttendanceController

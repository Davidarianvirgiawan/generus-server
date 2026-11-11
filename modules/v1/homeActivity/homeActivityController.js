const asyncHandler = require('express-async-handler')
const homeActivityService = require('./homeActivityService')
const eventConstant = require('../../../constants/eventConstant')
const loggerStatusConstant = require('../../../constants/loggerStatusConstant')
const positionTypesConstant = require('../../../constants/positionTypesConstant')
const { logger } = require('../../../utils/loggerUtils')
const { paginate } = require('../../../utils/paginationUtils')

const homeActivityController = {}

// @desc    list home activities of the user's region (admin: own region, incl. inactive; ?studentId= for a student's list)
// @route   GET /home-activities?studentId=
// @access  Protect
homeActivityController.list = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.list.event
    const { position } = req.auth.data
    const data = position?.type === positionTypesConstant.ADMIN
        ? await homeActivityService.listForAdmin(position.orgId, req.query.studentId)
        : await homeActivityService.listForOrg(position?.orgId)
    res.json({ data })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    create home activity
// @route   POST /home-activities
// @access  Protect, Admin
homeActivityController.create = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.create.event
    const { type, groupName, name, sortOrder } = req.body
    const result = await homeActivityService.create(req.auth.data.position.orgId, { type, groupName, name, sortOrder })
    res.status(201).json({ message: 'SUCCESS', id: result.id })
    logger({ req, status: loggerStatusConstant.SUCCESS, statusCode: 201 })
})

// @desc    update home activity
// @route   PUT /home-activities/:id
// @access  Protect, Admin
homeActivityController.update = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.update.event
    const { type, groupName, name, sortOrder, isActive } = req.body
    await homeActivityService.update(req.params.id, req.auth.data.position.orgId, { type, groupName, name, sortOrder, isActive })
    res.json({ message: 'SUCCESS' })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    delete home activity
// @route   DELETE /home-activities/:id
// @access  Protect, Admin
homeActivityController.delete = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.delete.event
    await homeActivityService.delete(req.params.id, req.auth.data.position.orgId)
    res.json({ id: req.params.id })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    list checked activity ids of a child on a date
// @route   GET /home-activities/logs?studentId=&date=YYYY-MM-DD
// @access  Protect, Parent
homeActivityController.logs = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.logs.event
    const { studentId, date } = req.query
    const data = await homeActivityService.logs({ parentId: req.auth.data.id, studentId, date })
    res.json({ data })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    check/uncheck an activity for a child on a date
// @route   PUT /home-activities/logs
// @access  Protect, Parent
homeActivityController.check = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.check.event
    const { studentId, activityId, date, checked } = req.body
    await homeActivityService.check({ parentId: req.auth.data.id, studentId, activityId, date, checked })
    res.json({ message: 'SUCCESS' })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    activity list of an approved child
// @route   GET /home-activities/children/:studentId/activities
// @access  Protect, Parent
homeActivityController.childActivities = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.list.event
    const data = await homeActivityService.listForChild(req.auth.data.id, req.params.studentId)
    res.json({ data })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    approved children / pending requests of a parent
// @route   GET /home-activities/children, GET /home-activities/requests
// @access  Protect, Parent
homeActivityController.children = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.parents.event
    res.json({ data: await homeActivityService.children(req.auth.data.id) })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

homeActivityController.requests = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.parents.event
    res.json({ data: await homeActivityService.requests(req.auth.data.id) })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    parent approves/rejects a student's request
// @route   PUT /home-activities/requests/:studentId   body: { approve }
// @access  Protect, Parent
homeActivityController.answerRequest = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.parents.event
    await homeActivityService.answerRequest(req.auth.data.id, req.params.studentId, req.body.approve)
    res.json({ message: 'SUCCESS' })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    parent search / own parent links / request / remove (student)
// @route   GET /home-activities/parent-search?search=, GET|POST /home-activities/parents, DELETE /home-activities/parents/:parentId
// @access  Protect, Student
homeActivityController.parentSearch = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.parents.event
    res.json({ data: await homeActivityService.searchParents(req.query.search) })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

homeActivityController.myParents = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.parents.event
    res.json({ data: await homeActivityService.myParents(req.auth.data.id) })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

homeActivityController.requestParent = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.parents.event
    await homeActivityService.requestParent(req.auth.data.id, req.body.parentId)
    res.status(201).json({ message: 'SUCCESS' })
    logger({ req, status: loggerStatusConstant.SUCCESS, statusCode: 201 })
})

homeActivityController.removeParent = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.parents.event
    await homeActivityService.removeParent(req.auth.data.id, req.params.parentId)
    res.json({ id: req.params.parentId })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    monthly report: students with their total checks
// @route   GET /home-activities/report?month=YYYY-MM&search=&page=&pageSize=
// @access  Protect, Admin
homeActivityController.report = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.report.event
    const { month, search, page, pageSize } = req.query
    const orgId = req.auth.data.position.orgId
    const { data, total, limit, from, to } = await homeActivityService.report({ orgId, month, search, page, pageSize })
    const currentPage = Math.max(Number(page) || 1, 1)
    const metadata = paginate({ page: currentPage, pageSize: limit, count: data.length, totalCount: total })
    res.json({ ...metadata, from, to, data })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    one student's checks in a month (dates x activities)
// @route   GET /home-activities/report/:studentId?month=YYYY-MM
// @access  Protect, Admin
homeActivityController.studentReport = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.report.event
    const orgId = req.auth.data.position.orgId
    const data = await homeActivityService.studentReport({ orgId, studentId: req.params.studentId, month: req.query.month })
    res.json({ data })
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

// @desc    student monthly report as excel
// @route   GET /home-activities/report/:studentId/download?month=YYYY-MM
// @access  Protect, Admin
homeActivityController.downloadStudentReport = asyncHandler(async (req, res) => {
    req.event = eventConstant.homeActivity.report.event
    const orgId = req.auth.data.position.orgId
    const name = typeof req.query.name === 'string' ? req.query.name.slice(0, 100) : ''
    const buffer = await homeActivityService.exportStudentReport({ orgId, studentId: req.params.studentId, month: req.query.month, name })
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(Buffer.from(buffer))
    logger({ req, status: loggerStatusConstant.SUCCESS })
})

module.exports = homeActivityController

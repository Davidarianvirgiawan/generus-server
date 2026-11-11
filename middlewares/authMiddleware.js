const jwt = require('jsonwebtoken')
const asyncHandler = require('express-async-handler')
const config = require('../config.js')
const positionTypesConstant = require('../constants/positionTypesConstant.js')
const { throwError } = require('../utils/errorUtils.js')
const eventConstant = require('../constants/eventConstant.js')
const organizationLevelsConstant = require('../constants/organizationLevelsConstant.js')
const accessTypesConstant = require('../constants/accessTypesConstant.js')
const authRepository = require(`../modules/${config.APP_VERSION}/auth/authRepository`)

const authMiddleware = {}
const event = eventConstant.auth.verify

authMiddleware.protect = asyncHandler(async (req, res, next) => {
    let token
    if (req.headers.authorization) {
        try {
            token = req.headers.authorization.split(' ')[1]
            const decoded = jwt.verify(token, config.JWT_KEY)
            const user = await authRepository.findUser(decoded.login)
            if (user) {
                req.auth = {
                    isAuthenticated: true,
                    data: decoded
                }
                next()
            }
        } catch (error) {
            throwError(event.message.failed.missing, 401)
        }
    }

    if (!token) {
        throwError(event.message.failed.missing, 401)
    }
})

authMiddleware.admin = asyncHandler(async (req, res, next) => {
    const { position, access } = req.auth.data
    const isNotAdmin = position?.type !== positionTypesConstant.ADMIN
    const isViewer = access?.type === accessTypesConstant.VIEWER
    if (isNotAdmin || isViewer) throwError(event.message.failed.unauthenticated, 401)
    next()
})

authMiddleware.mainAdmin = asyncHandler(async (req, res, next) => {
    const { position, access } = req.auth.data
    const isMainAdmin = position?.type === positionTypesConstant.ADMIN
        && position?.orgLevel === organizationLevelsConstant.ppg
    const isViewer = access?.type === accessTypesConstant.VIEWER
    if (isMainAdmin && !isViewer) return next()
    throwError(event.message.failed.unauthenticated, 401)
})

authMiddleware.teacher = asyncHandler(async (req, res, next) => {
    const { position, access } = req.auth.data
    
    const isAdminOrPengajar = 
        position?.type === positionTypesConstant.ADMIN || 
        position?.type === positionTypesConstant.PENGAJAR

    const isNotViewer = access?.type !== accessTypesConstant.VIEWER
    if (isAdminOrPengajar && isNotViewer) return next()
    throwError(event.message.failed.unauthenticated, 401)
})

authMiddleware.student = asyncHandler(async (req, res, next) => {
    const { position } = req.auth.data
    if (position?.type === positionTypesConstant.GENERUS) return next()
    throwError(event.message.failed.unauthenticated, 401)
})

authMiddleware.parent = asyncHandler(async (req, res, next) => {
    const { position } = req.auth.data
    if (position?.type === positionTypesConstant.ORANGTUA) return next()
    throwError(event.message.failed.unauthenticated, 401)
})

module.exports = authMiddleware
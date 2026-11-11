const ExcelJS = require('exceljs')
const homeActivityRepository = require('./homeActivityRepository')
const eventConstant = require('../../../constants/eventConstant')
const { throwError } = require('../../../utils/errorUtils')

const TYPES = ['CORE', 'ADDITIONAL']

const isDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const parsed = new Date(`${value}T00:00:00Z`)
    return !isNaN(parsed) && parsed.toISOString().slice(0, 10) === value
}
const isId = (value) => /^\d+$/.test(String(value))

const homeActivityService = {}

// admin: own list, generated from the nearest ancestor's list (or the default) on first access
homeActivityService.listForAdmin = async (orgId, studentId) => {
    if (studentId) {
        if (!isId(studentId)) throwError(eventConstant.homeActivity.list.message.failed.invalidInput, 400)
        const studentOrgId = await homeActivityRepository.findStudentOrgId(studentId)
        return homeActivityService.listForOrg(studentOrgId)
    }
    if (!await homeActivityRepository.hasOwn(orgId)) {
        const fromOrganizationId = await homeActivityRepository.findEffectiveOrgId(orgId)
        await homeActivityRepository.copy({ fromOrganizationId, toOrganizationId: orgId })
    }
    return homeActivityRepository.findAll({ organizationId: orgId, includeInactive: true })
}

// student: list of the nearest ancestor that has one, otherwise the default
homeActivityService.listForOrg = async (orgId) => {
    const organizationId = orgId ? await homeActivityRepository.findEffectiveOrgId(orgId) : null
    return homeActivityRepository.findAll({ organizationId, includeInactive: false })
}

homeActivityService.create = async (orgId, { type, groupName, name, sortOrder }) => {
    const event = eventConstant.homeActivity.create
    if (!TYPES.includes(type)) throwError(event.message.failed.invalidType, 400)
    if (!groupName || !String(groupName).trim()) throwError(event.message.failed.invalidData, 400)
    if (type === 'CORE' && (!name || !String(name).trim())) throwError(event.message.failed.invalidName, 400)
    return homeActivityRepository.insert({
        organizationId: orgId,
        type,
        groupName: String(groupName).trim(),
        name: name ? String(name).trim() : null,
        sortOrder: Number.isInteger(sortOrder) ? sortOrder : null,
    })
}

homeActivityService.update = async (id, orgId, { type, groupName, name, sortOrder, isActive }) => {
    if (!isId(id)) throwError(eventConstant.homeActivity.update.message.failed.notFound, 404)
    if (type !== undefined && !TYPES.includes(type)) throwError(eventConstant.homeActivity.create.message.failed.invalidType, 400)
    const count = await homeActivityRepository.update(id, orgId, {
        type: type ?? null,
        groupName: groupName ? String(groupName).trim() : null,
        name: name ? String(name).trim() : null,
        sortOrder: Number.isInteger(sortOrder) ? sortOrder : null,
        isActive: typeof isActive === 'boolean' ? isActive : null,
    })
    if (!count) throwError(eventConstant.homeActivity.update.message.failed.notFound, 404)
}

homeActivityService.delete = async (id, orgId) => {
    if (!isId(id)) throwError(eventConstant.homeActivity.update.message.failed.notFound, 404)
    await homeActivityRepository.delete(id, orgId)
}

const assertApprovedChild = async (parentId, studentId) => {
    if (!isId(studentId)) throwError(eventConstant.homeActivity.parents.message.failed.invalidInput, 400)
    const link = await homeActivityRepository.findParentLink(parentId, studentId)
    if (!link || link.status !== 'APPROVED') throwError(eventConstant.homeActivity.parents.message.failed.forbidden, 403)
}

homeActivityService.listForChild = async (parentId, studentId) => {
    await assertApprovedChild(parentId, studentId)
    return homeActivityService.listForOrg(await homeActivityRepository.findStudentOrgId(studentId))
}

homeActivityService.logs = async ({ parentId, studentId, date }) => {
    if (!isDate(date)) throwError(eventConstant.homeActivity.logs.message.failed.invalidInput, 400)
    await assertApprovedChild(parentId, studentId)
    const logs = await homeActivityRepository.findLogs(studentId, date)
    return logs.map(log => Number(log.activityId))
}

homeActivityService.check = async ({ parentId, studentId, activityId, date, checked }) => {
    const event = eventConstant.homeActivity.check
    if (!isId(activityId) || !isDate(date) || typeof checked !== 'boolean') {
        throwError(event.message.failed.invalidInput, 400)
    }
    await assertApprovedChild(parentId, studentId)
    const studentOrgId = await homeActivityRepository.findStudentOrgId(studentId)
    const activity = await homeActivityRepository.findById(activityId, await homeActivityRepository.findEffectiveOrgId(studentOrgId))
    if (!activity) throwError(event.message.failed.notFound, 404)
    const data = { studentId, activityId, date }
    if (checked) await homeActivityRepository.insertLog({ ...data, createdBy: parentId })
    else await homeActivityRepository.deleteLog(data)
}

// student side
homeActivityService.searchParents = async (search) => {
    const keyword = typeof search === 'string' ? search.trim() : ''
    if (keyword.length < 2) return []
    return homeActivityRepository.searchParents(keyword)
}

homeActivityService.myParents = (studentId) => homeActivityRepository.findStudentParents(studentId)

homeActivityService.requestParent = async (studentId, parentId) => {
    const failed = eventConstant.homeActivity.parents.message.failed
    if (!isId(parentId)) throwError(failed.invalidInput, 400)
    if (!await homeActivityRepository.isParent(parentId)) throwError(failed.notFound, 404)
    if (await homeActivityRepository.findParentLink(parentId, studentId)) throwError(failed.exists, 409)
    await homeActivityRepository.insertLink({ parentId, studentId })
}

homeActivityService.removeParent = async (studentId, parentId) => {
    if (!isId(parentId)) throwError(eventConstant.homeActivity.parents.message.failed.invalidInput, 400)
    await homeActivityRepository.deleteLink(parentId, studentId)
}

// parent side
homeActivityService.children = (parentId) => homeActivityRepository.findParentChildren(parentId, 'APPROVED')
homeActivityService.requests = (parentId) => homeActivityRepository.findParentChildren(parentId, 'PENDING')

homeActivityService.answerRequest = async (parentId, studentId, approve) => {
    const failed = eventConstant.homeActivity.parents.message.failed
    if (!isId(studentId) || typeof approve !== 'boolean') throwError(failed.invalidInput, 400)
    const link = await homeActivityRepository.findParentLink(parentId, studentId)
    if (!link || link.status !== 'PENDING') throwError(failed.notFound, 404)
    if (approve) await homeActivityRepository.approveLink(parentId, studentId)
    else await homeActivityRepository.deleteLink(parentId, studentId)
}

const monthRange = (month) => {
    if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        throwError(eventConstant.homeActivity.report.message.failed.invalidInput, 400)
    }
    const [year, mon] = month.split('-').map(Number)
    const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate()
    return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` }
}

homeActivityService.report = async ({ orgId, month, search, page, pageSize }) => {
    const { from, to } = monthRange(month)
    const keyword = typeof search === 'string' ? search.trim() : ''
    const limit = Math.min(Math.max(Number(pageSize) || 20, 1), 100)
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit
    const result = await homeActivityRepository.findReport({ orgId, from, to, search: keyword, limit, offset })
    return { ...result, limit, from, to }
}

homeActivityService.studentReport = async ({ orgId, studentId, month }) => {
    if (!isId(studentId)) throwError(eventConstant.homeActivity.report.message.failed.invalidInput, 400)
    const { from, to } = monthRange(month)
    const logs = await homeActivityRepository.findStudentLogs({ orgId, studentId, from, to })
    return { from, to, logs: logs.map(log => ({ date: log.date, activityId: Number(log.activityId) })) }
}

homeActivityService.exportStudentReport = async ({ orgId, studentId, month, name }) => {
    const { from, to, logs } = await homeActivityService.studentReport({ orgId, studentId, month })
    const activities = await homeActivityService.listForAdmin(orgId, studentId)
    const checked = new Set(logs.map(log => `${log.activityId}|${log.date}`))
    const days = Number(to.slice(8, 10))
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Rekap Kegiatan Rumah')
    sheet.addRow([`Rekap Kegiatan Rumah - ${name || ''}`]).font = { bold: true }
    sheet.addRow([`Periode ${from} s/d ${to}`])
    sheet.addRow([])
    const header = sheet.addRow(['Kegiatan', ...Array.from({ length: days }, (_, i) => i + 1), 'Jml'])
    const rows = activities.filter(a => a.isActive !== false).map(activity => {
        let count = 0
        const cells = Array.from({ length: days }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, '0')}`
            if (checked.has(`${activity.id}|${date}`)) {
                count += 1
                return '✓'
            }
            return date < today ? '✕' : ''
        })
        return sheet.addRow([activity.name ? `${activity.groupName} - ${activity.name}` : activity.groupName, ...cells, count])
    })
    const border = { style: 'thin' }
    ;[header, ...rows].forEach(row => {
        row.eachCell(cell => {
            cell.border = { top: border, left: border, bottom: border, right: border }
            if (cell.col > 1) cell.alignment = { horizontal: 'center' }
        })
    })
    header.font = { bold: true }
    header.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } } })
    sheet.getColumn(1).width = 42
    for (let c = 2; c <= days + 2; c++) sheet.getColumn(c).width = 4.5
    sheet.getColumn(days + 2).width = 6
    return workbook.xlsx.writeBuffer()
}

module.exports = homeActivityService

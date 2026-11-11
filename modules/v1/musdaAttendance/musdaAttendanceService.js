const ExcelJS = require('exceljs')
const musdaAttendanceRepository = require('./musdaAttendanceRepository')
const eventConstant = require('../../../constants/eventConstant')
const { throwError } = require('../../../utils/errorUtils')

const musdaAttendanceService = {}
const message = eventConstant.musdaAttendance
const MAX_PAGE_SIZE = 100
const MAX_TEXT = 100

const currentMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const resolveMonth = (month, failedMessage) => {
    if (month === undefined || month === '') return currentMonth()
    if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throwError(failedMessage, 400)
    return month
}

const cleanText = (value) => typeof value === 'string' ? value.trim().slice(0, MAX_TEXT) : ''

const cleanEntry = ({ name, dapukan, isPresent }, failedMessage) => {
    const entry = { name: cleanText(name), dapukan: cleanText(dapukan), isPresent: isPresent === true }
    if (!entry.name || !entry.dapukan) throwError(failedMessage, 400)
    return entry
}

musdaAttendanceService.list = async ({ organizationId, month, page, pageSize }) => {
    const resolvedMonth = resolveMonth(month, message.list.message.failed.invalidInput)
    const limit = Math.min(Math.max(Number(pageSize) || 20, 1), MAX_PAGE_SIZE)
    const currentPage = Math.max(Number(page) || 1, 1)
    const [data, counts] = await Promise.all([
        musdaAttendanceRepository.findAll({ organizationId, month: resolvedMonth, limit, offset: (currentPage - 1) * limit }),
        musdaAttendanceRepository.count({ organizationId, month: resolvedMonth }),
    ])
    return { month: resolvedMonth, data, total: counts.total, present: counts.present, limit }
}

musdaAttendanceService.create = async (organizationId, body) => {
    const month = resolveMonth(body.month, message.create.message.failed.invalidInput)
    const entry = cleanEntry(body, message.create.message.failed.invalidInput)
    return musdaAttendanceRepository.insert({ organizationId, month, ...entry })
}

musdaAttendanceService.update = async (id, organizationId, body) => {
    const entry = cleanEntry(body, message.update.message.failed.invalidInput)
    const updated = await musdaAttendanceRepository.update(id, organizationId, entry)
    if (!updated) throwError(message.update.message.failed.notFound, 404)
}

musdaAttendanceService.delete = async (id, organizationId) => {
    await musdaAttendanceRepository.delete(id, organizationId)
}

musdaAttendanceService.export = async ({ organizationId, month }) => {
    const resolvedMonth = resolveMonth(month, message.list.message.failed.invalidInput)
    const rows = await musdaAttendanceRepository.findAll({ organizationId, month: resolvedMonth })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Absensi Musppg')
    sheet.addRow([`Absensi Musppg - ${resolvedMonth}`]).font = { bold: true }
    sheet.addRow([])
    const header = sheet.addRow(['No', 'Nama', 'Dapukan', 'Hadir'])
    const body = rows.map((row, index) => sheet.addRow([index + 1, row.name, row.dapukan, row.isPresent ? '✓' : '']))
    const present = rows.filter(row => row.isPresent).length
    sheet.addRow([])
    sheet.addRow(['', 'Hadir', `${present} dari ${rows.length}`])

    const border = { style: 'thin' }
    ;[header, ...body].forEach(row => {
        row.eachCell(cell => {
            cell.border = { top: border, left: border, bottom: border, right: border }
        })
        row.getCell(1).alignment = { horizontal: 'center' }
        row.getCell(4).alignment = { horizontal: 'center' }
    })
    header.font = { bold: true }
    header.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } } })
    sheet.getColumn(1).width = 5
    sheet.getColumn(2).width = 32
    sheet.getColumn(3).width = 28
    sheet.getColumn(4).width = 8
    return { month: resolvedMonth, buffer: await workbook.xlsx.writeBuffer() }
}

module.exports = musdaAttendanceService

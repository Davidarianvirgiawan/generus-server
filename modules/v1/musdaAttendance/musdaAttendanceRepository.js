const { QueryTypes } = require('sequelize')
const db = require('../../../database/config/postgresql')

const musdaAttendanceRepository = {}

musdaAttendanceRepository.findAll = async ({ organizationId, month, limit, offset }) => {
    return db.query(`
        SELECT "id", "name", "dapukan", "isPresent"
        FROM "musdaAttendances"
        WHERE "organizationId" = :organizationId AND "month" = :month
        ORDER BY "id"
        ${limit ? 'LIMIT :limit OFFSET :offset' : ''}`, {
            replacements: { organizationId, month, limit, offset },
            type: QueryTypes.SELECT,
        }
    )
}

musdaAttendanceRepository.count = async ({ organizationId, month }) => {
    const results = await db.query(`
        SELECT COUNT(*)::int AS "total",
               COUNT(*) FILTER (WHERE "isPresent")::int AS "present"
        FROM "musdaAttendances"
        WHERE "organizationId" = :organizationId AND "month" = :month`, {
            replacements: { organizationId, month },
            type: QueryTypes.SELECT,
        }
    )
    return results[0]
}

musdaAttendanceRepository.insert = async ({ organizationId, month, name, dapukan, isPresent }) => {
    const now = Date.now()
    const results = await db.query(`
        INSERT INTO "musdaAttendances" ("organizationId", "month", "name", "dapukan", "isPresent", "createdAt", "updatedAt")
        VALUES (:organizationId, :month, :name, :dapukan, :isPresent, :now, :now)
        RETURNING "id"`, {
            replacements: { organizationId, month, name, dapukan, isPresent, now },
            type: QueryTypes.SELECT,
        }
    )
    return results[0]
}

musdaAttendanceRepository.update = async (id, organizationId, { name, dapukan, isPresent }) => {
    const results = await db.query(`
        UPDATE "musdaAttendances"
        SET "name" = :name, "dapukan" = :dapukan, "isPresent" = :isPresent, "updatedAt" = :now
        WHERE "id" = :id AND "organizationId" = :organizationId
        RETURNING "id"`, {
            replacements: { id, organizationId, name, dapukan, isPresent, now: Date.now() },
            type: QueryTypes.SELECT,
        }
    )
    return results.length
}

musdaAttendanceRepository.delete = async (id, organizationId) => {
    await db.query(`
        DELETE FROM "musdaAttendances" WHERE "id" = :id AND "organizationId" = :organizationId`, {
            replacements: { id, organizationId },
            type: QueryTypes.DELETE,
        }
    )
}

module.exports = musdaAttendanceRepository

const { QueryTypes } = require('sequelize')
const db = require('../../../database/config/postgresql')

const homeActivityRepository = {}

// organizationId NULL is the default template used when no ancestor has its own list
homeActivityRepository.findAll = async ({ organizationId, includeInactive }) => {
    return db.query(`
        SELECT "id", "type", "groupName", "name", "sortOrder", "isActive"
        FROM "homeActivities"
        WHERE "organizationId" IS NOT DISTINCT FROM :organizationId::bigint
        ${includeInactive ? '' : 'AND "isActive" = TRUE'}
        ORDER BY "sortOrder", "id"`, {
            replacements: { organizationId },
            type: QueryTypes.SELECT,
        }
    )
}

homeActivityRepository.findEffectiveOrgId = async (orgId) => {
    const results = await db.query(`
        SELECT oh."ancestorId"
        FROM "organizationHierarchies" oh
        WHERE oh."descendantId" = :orgId
          AND EXISTS (SELECT 1 FROM "homeActivities" h WHERE h."organizationId" = oh."ancestorId")
        ORDER BY oh."depth"
        LIMIT 1`, {
            replacements: { orgId },
            type: QueryTypes.SELECT,
        }
    )
    return results[0] ? results[0].ancestorId : null
}

homeActivityRepository.hasOwn = async (organizationId) => {
    const results = await db.query(`
        SELECT 1 FROM "homeActivities" WHERE "organizationId" = :organizationId LIMIT 1`, {
            replacements: { organizationId },
            type: QueryTypes.SELECT,
        }
    )
    return results.length > 0
}

homeActivityRepository.copy = async ({ fromOrganizationId, toOrganizationId }) => {
    await db.query(`
        INSERT INTO "homeActivities" ("type", "groupName", "name", "sortOrder", "isActive", "organizationId", "createdAt", "updatedAt")
        SELECT "type", "groupName", "name", "sortOrder", "isActive", :toOrganizationId, :now, :now
        FROM "homeActivities"
        WHERE "organizationId" IS NOT DISTINCT FROM :fromOrganizationId::bigint`, {
            replacements: { fromOrganizationId, toOrganizationId, now: Date.now() },
            type: QueryTypes.INSERT,
        }
    )
}

homeActivityRepository.findStudentOrgId = async (studentId) => {
    const results = await db.query(`
        SELECT p."organizationId"
        FROM "usersPositions" up
        JOIN "positions" p ON p."id" = up."positionId" AND p."type" = 'GENERUS'
        WHERE up."userId" = :studentId
        LIMIT 1`, {
            replacements: { studentId },
            type: QueryTypes.SELECT,
        }
    )
    return results[0] ? results[0].organizationId : null
}

homeActivityRepository.findById = async (id, organizationId) => {
    const results = await db.query(`
        SELECT "id" FROM "homeActivities"
        WHERE "id" = :id AND "isActive" = TRUE
          AND "organizationId" IS NOT DISTINCT FROM :organizationId::bigint`, {
            replacements: { id, organizationId: organizationId || null },
            type: QueryTypes.SELECT,
        }
    )
    return results[0]
}

homeActivityRepository.insert = async ({ organizationId, type, groupName, name, sortOrder }) => {
    const now = Date.now()
    const results = await db.query(`
        INSERT INTO "homeActivities" ("organizationId", "type", "groupName", "name", "sortOrder", "createdAt", "updatedAt")
        VALUES (:organizationId, :type, :groupName, :name, COALESCE(:sortOrder, (SELECT COALESCE(MAX("sortOrder"), 0) + 1 FROM "homeActivities" WHERE "organizationId" = :organizationId)), :now, :now)
        RETURNING "id"`, {
            replacements: { organizationId, type, groupName, name, sortOrder, now },
            type: QueryTypes.SELECT,
        }
    )
    return results[0]
}

homeActivityRepository.update = async (id, organizationId, { type, groupName, name, sortOrder, isActive }) => {
    const now = Date.now()
    const results = await db.query(`
        UPDATE "homeActivities"
        SET "type" = COALESCE(:type, "type"),
            "groupName" = COALESCE(:groupName, "groupName"),
            "name" = COALESCE(:name, "name"),
            "sortOrder" = COALESCE(:sortOrder, "sortOrder"),
            "isActive" = COALESCE(:isActive, "isActive"),
            "updatedAt" = :now
        WHERE "id" = :id AND "organizationId" = :organizationId
        RETURNING "id"`, {
            replacements: { id, organizationId, type, groupName, name, sortOrder, isActive, now },
            type: QueryTypes.SELECT,
        }
    )
    return results.length
}

homeActivityRepository.delete = async (id, organizationId) => {
    await db.query(`
        DELETE FROM "homeActivities" WHERE "id" = :id AND "organizationId" = :organizationId`, {
            replacements: { id, organizationId },
            type: QueryTypes.DELETE,
        }
    )
}

homeActivityRepository.findLogs = async (studentId, date) => {
    return db.query(`
        SELECT "activityId" FROM "homeActivityLogs"
        WHERE "studentId" = :studentId AND "date" = :date`, {
            replacements: { studentId, date },
            type: QueryTypes.SELECT,
        }
    )
}

homeActivityRepository.insertLog = async ({ studentId, activityId, date, createdBy }) => {
    await db.query(`
        INSERT INTO "homeActivityLogs" ("studentId", "activityId", "date", "createdAt", "createdBy")
        VALUES (:studentId, :activityId, :date, :now, :createdBy)
        ON CONFLICT ("studentId", "activityId", "date") DO NOTHING`, {
            replacements: { studentId, activityId, date, createdBy, now: Date.now() },
            type: QueryTypes.INSERT,
        }
    )
}

homeActivityRepository.deleteLog = async ({ studentId, activityId, date }) => {
    await db.query(`
        DELETE FROM "homeActivityLogs"
        WHERE "studentId" = :studentId AND "activityId" = :activityId AND "date" = :date`, {
            replacements: { studentId, activityId, date },
            type: QueryTypes.DELETE,
        }
    )
}

homeActivityRepository.searchParents = async (search, limit = 10) => {
    return db.query(`
        SELECT DISTINCT u."id", u."name"
        FROM "users" u
        JOIN "usersPositions" up ON up."userId" = u."id"
        JOIN "positions" p ON p."id" = up."positionId" AND p."type" = 'ORANGTUA'
        WHERE u."deletedAt" IS NULL AND u."name" ILIKE :search
        ORDER BY u."name"
        LIMIT :limit`, {
            replacements: { search: `%${search}%`, limit },
            type: QueryTypes.SELECT,
        }
    )
}

homeActivityRepository.findParentLink = async (parentId, studentId) => {
    const results = await db.query(`
        SELECT "parentId", "studentId", "status" FROM "parentStudents"
        WHERE "parentId" = :parentId AND "studentId" = :studentId`, {
            replacements: { parentId, studentId },
            type: QueryTypes.SELECT,
        }
    )
    return results[0]
}

homeActivityRepository.isParent = async (userId) => {
    const results = await db.query(`
        SELECT 1 FROM "users" u
        JOIN "usersPositions" up ON up."userId" = u."id"
        JOIN "positions" p ON p."id" = up."positionId" AND p."type" = 'ORANGTUA'
        WHERE u."id" = :userId AND u."deletedAt" IS NULL
        LIMIT 1`, {
            replacements: { userId },
            type: QueryTypes.SELECT,
        }
    )
    return results.length > 0
}

homeActivityRepository.insertLink = async ({ parentId, studentId }) => {
    await db.query(`
        INSERT INTO "parentStudents" ("parentId", "studentId", "status", "createdAt", "createdBy")
        VALUES (:parentId, :studentId, 'PENDING', :now, :studentId)
        ON CONFLICT ("parentId", "studentId") DO NOTHING`, {
            replacements: { parentId, studentId, now: Date.now() },
            type: QueryTypes.INSERT,
        }
    )
}

homeActivityRepository.approveLink = async (parentId, studentId) => {
    const results = await db.query(`
        UPDATE "parentStudents" SET "status" = 'APPROVED'
        WHERE "parentId" = :parentId AND "studentId" = :studentId
        RETURNING "studentId"`, {
            replacements: { parentId, studentId },
            type: QueryTypes.SELECT,
        }
    )
    return results.length
}

homeActivityRepository.deleteLink = async (parentId, studentId) => {
    await db.query(`
        DELETE FROM "parentStudents"
        WHERE "parentId" = :parentId AND "studentId" = :studentId`, {
            replacements: { parentId, studentId },
            type: QueryTypes.DELETE,
        }
    )
}

homeActivityRepository.findStudentParents = async (studentId) => {
    return db.query(`
        SELECT ps."parentId", u."name", ps."status"
        FROM "parentStudents" ps
        JOIN "users" u ON u."id" = ps."parentId"
        WHERE ps."studentId" = :studentId
        ORDER BY u."name"`, {
            replacements: { studentId },
            type: QueryTypes.SELECT,
        }
    )
}

homeActivityRepository.findParentChildren = async (parentId, status) => {
    return db.query(`
        SELECT ps."studentId", u."name"
        FROM "parentStudents" ps
        JOIN "users" u ON u."id" = ps."studentId" AND u."deletedAt" IS NULL
        WHERE ps."parentId" = :parentId AND ps."status" = :status
        ORDER BY u."name"`, {
            replacements: { parentId, status },
            type: QueryTypes.SELECT,
        }
    )
}

homeActivityRepository.findReport = async ({ orgId, from, to, search, limit, offset }) => {
    const filters = `
        FROM "homeActivityLogs" l
        JOIN "users" u ON u."id" = l."studentId"
        JOIN "usersPositions" up ON up."userId" = u."id"
        JOIN "positions" p ON p."id" = up."positionId" AND p."type" = 'GENERUS'
        LEFT JOIN "organizations" o ON o."id" = p."organizationId"
        WHERE l."date" BETWEEN :from AND :to
          AND u."deletedAt" IS NULL
          AND (:search::text IS NULL OR u."name" ILIKE :search::text)
          AND p."organizationId" IN (
              SELECT "descendantId" FROM "organizationHierarchies" WHERE "ancestorId" = :orgId
          )`
    const replacements = { orgId, from, to, search: search ? `%${search}%` : null, limit, offset }
    const data = await db.query(`
        SELECT l."studentId", u."name" as "studentName", MIN(o."name") as "organizationName",
            COUNT(*)::int as "totalChecks", COUNT(DISTINCT l."date")::int as "totalDays"
        ${filters}
        GROUP BY l."studentId", u."name"
        ORDER BY u."name"
        LIMIT :limit OFFSET :offset`, { replacements, type: QueryTypes.SELECT })
    const total = await db.query(`
        SELECT COUNT(*) as count FROM (
            SELECT l."studentId" ${filters} GROUP BY l."studentId"
        ) t`, { replacements, type: QueryTypes.SELECT })
    return { data, total: Number(total[0].count) }
}

homeActivityRepository.findStudentLogs = async ({ orgId, studentId, from, to }) => {
    return db.query(`
        SELECT l."date", l."activityId"
        FROM "homeActivityLogs" l
        WHERE l."studentId" = :studentId AND l."date" BETWEEN :from AND :to
          AND EXISTS (
              SELECT 1 FROM "usersPositions" up
              JOIN "positions" p ON p."id" = up."positionId" AND p."type" = 'GENERUS'
              WHERE up."userId" = l."studentId" AND p."organizationId" IN (
                  SELECT "descendantId" FROM "organizationHierarchies" WHERE "ancestorId" = :orgId
              )
          )
        ORDER BY l."date"`, {
            replacements: { orgId, studentId, from, to },
            type: QueryTypes.SELECT,
        }
    )
}

module.exports = homeActivityRepository

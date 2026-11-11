module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.sequelize.query(`
            CREATE TABLE IF NOT EXISTS "homeActivityLogs" (
                "id"          BIGSERIAL PRIMARY KEY,
                "studentId"   bigint NOT NULL,
                "activityId"  integer NOT NULL REFERENCES "homeActivities" ("id") ON DELETE CASCADE,
                "date"        date NOT NULL,
                "createdAt"   bigint,
                "createdBy"   bigint,
                UNIQUE ("studentId", "activityId", "date")
            );
            CREATE INDEX IF NOT EXISTS "homeActivityLogsStudentDateIdx" ON "homeActivityLogs" ("studentId", "date");
        `)
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.sequelize.query(`
            DROP TABLE IF EXISTS "homeActivityLogs";
        `)
    }
}

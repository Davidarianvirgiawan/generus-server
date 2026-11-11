module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.sequelize.query(`
            CREATE TABLE IF NOT EXISTS "parentStudents" (
                "parentId"    bigint NOT NULL,
                "studentId"   bigint NOT NULL,
                "createdAt"   bigint,
                "createdBy"   bigint,
                PRIMARY KEY ("parentId", "studentId")
            );
            CREATE INDEX IF NOT EXISTS "parentStudentsStudentIdx" ON "parentStudents" ("studentId");
        `)
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.sequelize.query(`
            DROP TABLE IF EXISTS "parentStudents";
        `)
    }
}

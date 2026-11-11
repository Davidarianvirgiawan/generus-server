module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.sequelize.query(`
            CREATE TABLE IF NOT EXISTS "musdaAttendances" (
                "id"             SERIAL PRIMARY KEY,
                "organizationId" bigint NOT NULL,
                "month"          varchar(7) NOT NULL,
                "name"           varchar NOT NULL,
                "dapukan"        varchar NOT NULL,
                "isPresent"      boolean NOT NULL DEFAULT false,
                "createdAt"      bigint,
                "updatedAt"      bigint
            );
            CREATE INDEX IF NOT EXISTS "musdaAttendancesOrgMonthIdx" ON "musdaAttendances" ("organizationId", "month");
        `)
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.sequelize.query(`
            DROP TABLE IF EXISTS "musdaAttendances";
        `)
    }
}

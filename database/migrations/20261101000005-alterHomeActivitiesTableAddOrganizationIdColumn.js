module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.sequelize.query(`
            ALTER TABLE "homeActivities" ADD COLUMN IF NOT EXISTS "organizationId" bigint;
            CREATE INDEX IF NOT EXISTS "homeActivitiesOrganizationIdIdx" ON "homeActivities" ("organizationId");
        `)
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.sequelize.query(`
            DROP INDEX IF EXISTS "homeActivitiesOrganizationIdIdx";
            ALTER TABLE "homeActivities" DROP COLUMN IF EXISTS "organizationId";
        `)
    }
}

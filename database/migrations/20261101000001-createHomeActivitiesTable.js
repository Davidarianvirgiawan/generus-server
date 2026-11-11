module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.sequelize.query(`
            CREATE TABLE IF NOT EXISTS "homeActivities" (
                "id"          SERIAL PRIMARY KEY,
                "type"        varchar NOT NULL,
                "groupName"   varchar NOT NULL,
                "name"        varchar,
                "sortOrder"   integer NOT NULL DEFAULT 0,
                "isActive"    boolean NOT NULL DEFAULT true,
                "createdAt"   bigint,
                "updatedAt"   bigint
            );
        `)
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.sequelize.query(`
            DROP TABLE IF EXISTS "homeActivities";
        `)
    }
}

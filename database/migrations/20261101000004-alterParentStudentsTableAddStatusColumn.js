module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.sequelize.query(`
            ALTER TABLE "parentStudents"
            ADD COLUMN IF NOT EXISTS "status" varchar(10) NOT NULL DEFAULT 'APPROVED';
        `)
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.sequelize.query(`
            ALTER TABLE "parentStudents" DROP COLUMN IF EXISTS "status";
        `)
    }
}

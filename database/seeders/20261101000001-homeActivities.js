const core = [
    ['TATA KRAMA BERJABAT TANGAN', [
        'Ketika bertemu dengan saudara seiman supaya berjabat tangan sambil mengucapkan “Alhamdulillah Astagfirulloh”',
        'Ketika berjabat tangan dengan orang yang lebih tua supaya mencium tangannya sebagai wujud ta’dzim',
        'Ketika berjabat tangan supaya saling bertatap muka (saling menatap dan tersenyum)',
    ]],
    ['TATA KRAMA MAKAN', [
        'Duduk dengan sopan',
        'Makan dengan tangan kanan',
        'Memulai makan dengan membaca basmalah (ketika lupa maka ucapkan Bismillahi awwaluhu wa akhiruhu), dan mengakhiri makan dengan mengucapkan do\'a setelah makan',
        'Mengambil makanan secukupnya dan dihabiskan',
        'Tidak meniup makanan',
        'Memulai makan dari tepi makanan',
        'Tidak berbicara ketika mulut masih penuh makanan',
        'Tidak minum di sela-sela makan (kecuali karena suatu hal), misalnya tersedak',
        'Mengunyah makanan dengan bibir tertutup sehingga kunyahannya tidak bersuara',
        'Mengambil kembali makanan yang jatuh di tempat yang bersih',
        'Tidak memasukkan makanan ke mulut sebelum makanan di dalam mulut habis',
        'Tidak terdengar suara benturan sendok, garpu dan piring',
        'Tidak melakukan hal yang tabu (kentut, bersendawa dan berdahak)',
        'Tidak mencela makanan',
    ]],
    ['TATA KRAMA MINUM', [
        'Memegang gelas pada tangkainya (bila bertangkai)',
        'Apabila disuguhkan cangkir dengan lepek, diusahakan ketika minum sekaligus diangkat dengan lepeknya',
        'Tidak minum langsung dari bibir teko dan tidak menuangkan langsung ke dalam mulut',
        'Tidak bernafas ke dalam gelas dan tidak meneguk minuman sekali habis',
        'Ketika minum, air minum tidak digunakan berkumur terlebih dahulu',
        'Khusus untuk minum susu, setelah minum supaya membaca do\'anya',
    ]],
]

const additional = ['MENATA SANDAL', 'MENJAGA KESUCIAN', 'TERTIB SHOLAT WAJIB']

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = Date.now()
        const data = []
        let order = 0
        core.forEach(([groupName, items]) => {
            items.forEach(name => {
                data.push({ type: 'CORE', groupName, name, sortOrder: order++, isActive: true, createdAt: now, updatedAt: now })
            })
        })
        additional.forEach(groupName => {
            data.push({ type: 'ADDITIONAL', groupName, name: null, sortOrder: order++, isActive: true, createdAt: now, updatedAt: now })
        })
        await queryInterface.bulkInsert('homeActivities', data)
    },
}

module.exports = {
    port: 3000,
    host: 'localhost',
    files: ['./**/*.{html,htm,css,js}'],
    watchOptions: {
        ignored: 'node_modules'
    },
    server: {
        baseDir: './'
    }
};

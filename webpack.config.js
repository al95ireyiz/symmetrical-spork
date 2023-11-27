const path = require('path');

module.exports = {
    mode: 'development', // Imposta la modalità di sviluppo
    devServer: {
        static: {
            directory: path.join(__dirname, 'src'), // La cartella di output del tuo bundle
        },
        compress: false,
        port: 8080, // La porta su cui il server sarà in ascolto
    },
};

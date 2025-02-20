const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
    downloadPath: path.join(__dirname, 'descargas'), // Carpeta de descargas
    logPath: path.join(__dirname, 'logs'), // Carpeta de logs
};

// Asegurar que existan las carpetas necesarias
function createRequiredDirectories() {
    [CONFIG.downloadPath, CONFIG.logPath].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// Crear directorios al inicio
createRequiredDirectories();

// Función para obtener la fecha de ayer en formato DDMMYYYY
function getYesterdayDate() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '');
}

// Función para escribir en el log
function writeToLog(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    const logFile = path.join(CONFIG.logPath, `download-${new Date().toISOString().split('T')[0]}.log`);
    
    console.log(message); // También mostramos en consola
    fs.appendFileSync(logFile, logMessage);
}

// Función principal
async function downloadYesterdayFiles() {
    try {
        writeToLog('Iniciando proceso de descarga');

        // Obtener la lista de archivos
        const response = await axios.get('https://plugsc-dev-psp.bizland.tech/api/v1/report/conciliation/files?size=1000');
        const files = response.data.content || [];
        
        // Filtrar archivos de ayer
        const yesterdayDate = getYesterdayDate();
        const yesterdayFiles = files.filter(file => file.fileName.includes(yesterdayDate));

        writeToLog(`Encontrados ${yesterdayFiles.length} archivos de ayer (${yesterdayDate})`);

        // Descargar cada archivo
        for (const file of yesterdayFiles) {
            writeToLog(`Descargando archivo: ${file.fileName}`);
            
            const fileResponse = await axios({
                url: `https://plugsc-dev-psp.bizland.tech/api/v1/report/conciliation/file/download?filename=${file.fileName}`,
                method: 'GET',
                responseType: 'stream'
            });

            const filePath = path.join(CONFIG.downloadPath, file.fileName);
            const writer = fs.createWriteStream(filePath);

            fileResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            writeToLog(`Archivo descargado exitosamente: ${file.fileName}`);
        }

        writeToLog('Proceso de descarga completado');
    } catch (error) {
        writeToLog(`ERROR: ${error.message}`);
        if (error.response) {
            writeToLog(`Error de API: ${JSON.stringify(error.response.data)}`);
        }
    }
}

// Ejecutar el script
downloadYesterdayFiles();

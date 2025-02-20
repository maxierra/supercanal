const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const axios = require('axios');

// Configuración del servidor Express
const server = express();
const port = 3000;

// Configurar el middleware para servir archivos estáticos
server.use('/libs', express.static(path.join(__dirname, 'public', 'libs')));
server.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para obtener los datos
server.get('/api/files', async (req, res) => {
    try {
        console.log('Obteniendo archivos...');
        const response = await axios.get('https://plugsc-dev-psp.bizland.tech/api/v1/report/conciliation/files?size=1000', {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        console.log('Respuesta recibida:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error al obtener datos:', error.message);
        if (error.response) {
            console.error('Error response:', error.response.data);
        }
        res.status(500).json({ error: 'Error al obtener los datos', details: error.message });
    }
});

// Ruta para descargar archivos
server.get('/api/download', async (req, res) => {
    const filename = req.query.filename;
    if (!filename) {
        return res.status(400).json({ error: 'Nombre de archivo requerido' });
    }

    try {
        console.log('Descargando archivo:', filename);
        const response = await axios({
            url: `https://plugsc-dev-psp.bizland.tech/api/v1/report/conciliation/file/download?filename=${filename}`,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'Accept': 'application/octet-stream'
            }
        });

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        response.data.pipe(res);
    } catch (error) {
        console.error('Error al descargar archivo:', error.message);
        if (error.response) {
            console.error('Error response:', error.response.data);
        }
        res.status(500).json({ error: 'Error al descargar el archivo', details: error.message });
    }
});

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    server.listen(port, '127.0.0.1', () => {
        console.log(`Servidor corriendo en http://localhost:${port}`);
        mainWindow.loadURL(`http://localhost:${port}`);
    });

    // Solo abrir DevTools en desarrollo si se pasa un argumento específico
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

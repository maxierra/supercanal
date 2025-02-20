const express = require('express');
const axios = require('axios');
const path = require('path');
const session = require('express-session');

const app = express();
const port = 3000;

// Middleware para parsear JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesión
app.use(session({
    secret: 'supercanal-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // cambiar a true si usas HTTPS
}));

// Configuración de usuarios
const users = {
    'claudio.nahoum@bizland.tech': {
        password: 'BVJhnwe03AaxqZx0',
        name: 'Claudio Nahoum'
    },
    'leandro.taiariol@bizland.tech': {
        password: 'kRGfmCkzc7tvj1jP',
        name: 'Leandro Taiariol'
    }
};

// Servir archivos estáticos
app.use(express.static('public'));

// Middleware de autenticación
const requireAuth = (req, res, next) => {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/login.html');
    }
};

// Ruta de login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // Verificar credenciales
    const user = users[email];
    if (user && user.password === password) {
        req.session.authenticated = true;
        req.session.user = { 
            email,
            name: user.name
        };
        res.json({ success: true, user: { email, name: user.name } });
    } else {
        res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
});

// Ruta de logout
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

// Ruta principal - requiere autenticación
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para obtener los datos - requiere autenticación
app.get('/api/files', requireAuth, async (req, res) => {
    try {
        console.log('Iniciando petición a la API externa...');
        const response = await axios.get('https://plugsc-dev-psp.bizland.tech/api/v1/report/conciliation/files?size=1000', {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('Respuesta recibida de la API externa');
        console.log('Status:', response.status);
        
        if (!response.data) {
            throw new Error('No se recibieron datos de la API');
        }
        
        res.json(response.data);
    } catch (error) {
        console.error('Error detallado:', error);
        res.status(500).json({ 
            error: 'Error al obtener los datos',
            details: error.message
        });
    }
});

// Ruta para descargar archivos - requiere autenticación
app.get('/api/download', requireAuth, async (req, res) => {
    const filename = req.query.filename;
    if (!filename) {
        return res.status(400).json({ error: 'Nombre de archivo requerido' });
    }

    try {
        console.log('Iniciando descarga del archivo:', filename);
        const response = await axios({
            url: `https://plugsc-dev-psp.bizland.tech/api/v1/report/conciliation/file/download?filename=${filename}`,
            method: 'GET',
            responseType: 'stream',
            timeout: 30000,
            headers: {
                'Accept': 'application/octet-stream'
            }
        });

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        response.data.pipe(res);
    } catch (error) {
        console.error('Error al descargar archivo:', error);
        res.status(500).json({ 
            error: 'Error al descargar el archivo',
            details: error.message
        });
    }
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        details: err.message
    });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

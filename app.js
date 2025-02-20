const express = require('express');
const axios = require('axios');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware para parsear JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de proxy para Render
app.set('trust proxy', 1);

// Configuración de sesión
app.use(session({
    secret: process.env.SESSION_SECRET || 'supercanal-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction, // true en producción
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    },
    proxy: isProduction
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

// Configuración de la API externa
const API_CONFIG = {
    baseURL: 'https://plugsc-dev-psp.bizland.tech',
    auth: {
        username: process.env.API_USERNAME || 'supercanal',
        password: process.env.API_PASSWORD || 'supercanal2024'
    },
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
};

// Crear instancia de axios con configuración base
const apiClient = axios.create(API_CONFIG);

// Servir archivos estáticos
app.use(express.static('public'));

// Middleware de autenticación
const requireAuth = (req, res, next) => {
    if (req.session && req.session.authenticated) {
        next();
    } else {
        if (req.xhr || req.headers.accept.includes('application/json')) {
            res.status(401).json({ error: 'No autenticado' });
        } else {
            res.redirect('/login.html');
        }
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
        
        // Asegurar que la sesión se guarde antes de responder
        req.session.save((err) => {
            if (err) {
                console.error('Error al guardar la sesión:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al iniciar sesión' 
                });
            }
            res.json({ 
                success: true, 
                user: { email, name: user.name } 
            });
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'Credenciales incorrectas' 
        });
    }
});

// Ruta de logout
app.get('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al cerrar sesión' 
            });
        }
        res.redirect('/login.html');
    });
});

// Ruta para verificar el estado de la sesión
app.get('/api/session', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.json({ 
            authenticated: true, 
            user: req.session.user 
        });
    } else {
        res.status(401).json({ 
            authenticated: false 
        });
    }
});

// Ruta principal - requiere autenticación
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para obtener los datos - requiere autenticación
app.get('/api/files', requireAuth, async (req, res) => {
    try {
        console.log('Iniciando petición a la API externa...');
        console.log('Usuario autenticado:', req.session.user.email);
        
        const response = await apiClient.get('/api/v1/report/conciliation/files', {
            params: {
                size: 1000
            }
        });
        
        console.log('Respuesta recibida de la API externa');
        console.log('Status:', response.status);
        
        if (!response.data) {
            throw new Error('No se recibieron datos de la API');
        }
        
        res.json(response.data);
    } catch (error) {
        console.error('Error detallado:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        
        res.status(error.response?.status || 500).json({ 
            error: 'Error al obtener los datos',
            details: error.message,
            status: error.response?.status
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
        const response = await apiClient({
            url: `/api/v1/report/conciliation/file/download?filename=${filename}`,
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

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
    console.log('Modo:', process.env.NODE_ENV || 'desarrollo');
    console.log('Cookies seguras:', isProduction);
});

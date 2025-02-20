# Supercanal - Sistema de Gestión de Archivos

Sistema para la gestión y descarga automática de archivos de conciliación.

## Características

- Interfaz web para visualización de archivos
- Descarga automática programada de archivos
- Sistema de autenticación
- Registro de actividades (logs)
- Búsqueda y filtrado de archivos

## Requisitos

- Node.js v12 o superior
- npm (incluido con Node.js)

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/maxierra/supercanal.git
cd supercanal
```

2. Instalar dependencias:
```bash
npm install
```

## Uso

### Modo Desarrollo
```bash
node app.js
```

### Descarga Automática
El script `download-files.js` puede configurarse con el Programador de tareas de Windows para ejecutarse automáticamente.

## Configuración

- Puerto por defecto: 3000
- Ruta de descargas: ./descargas
- Ruta de logs: ./logs

## Credenciales de Prueba

- Email: claudio.nahoum@bizland.tech
- Contraseña: [Contactar al administrador]

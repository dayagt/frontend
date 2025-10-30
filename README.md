# 📂 Sistema de Gestión de Expedientes (Frontend)

Este es el **frontend** del sistema de gestión de expedientes, desarrollado con **React + TypeScript + Tailwind CSS**.  
Se conecta con el backend disponible en el repositorio [`project-root`](https://github.com/dayagt/api.git).

---

## 🚀 Tecnologías utilizadas

- ⚛️ **React** (Vite + TypeScript)
- 🎨 **Tailwind CSS**
- 🛠 **Heroicons** (para iconografía)
- 🔒 **Auth Context + Hooks personalizados**
- 🍬 **SweetAlert2** (para alertas amigables)
- 🔗 Conexión a **API REST (Node.js + SQL Server)** del repo [`project-root`](https://github.com/dayagt/api.git)

---

## 📦 Requisitos previos

Antes de empezar asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
- [npm](https://www.npmjs.com/) 

---

## ⚙️ Instalación y configuración

1. **Clona este repositorio**
   ```bash
   git clone https://github.com/dayagt/frontend.git
   cd frontend
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno**
   Crea un archivo `.env` en la raíz del proyecto y define la URL de la API:
   ```env
   VITE_API_URL=http://localhost:3002
   ```

4. **Ejecuta en modo desarrollo**
   ```bash
   npm run dev
   ```

5. **Build para producción**
   ```bash
   npm run build
   ```

---

## 🔗 Relación con el backend

Este frontend **depende del repositorio API** [`project-root`](https://github.com/dayagt/api.git), el cual expone los endpoints que consume la aplicación.

Para que funcione correctamente:

1. Inicia primero el servidor de la API (`project-root`) en `http://localhost:3002`.
2. Luego arranca el frontend.
3. Ambos proyectos deben ejecutarse en paralelo.

--------------------


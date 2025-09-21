
# Cacho - Juego de Dados v0

Esta es una implementación local y minimalista del juego de dados "Cacho", desarrollada con React, TypeScript y Tailwind CSS.

## Cómo Correr el Proyecto

Sigue estos pasos para levantar el entorno de desarrollo:

1.  **Crear el proyecto con Vite:**
    Abre tu terminal y ejecuta el siguiente comando para crear un nuevo proyecto de React con la plantilla de TypeScript.

    ```bash
    npm create vite@latest cacho-game -- --template react-ts
    ```

2.  **Navegar al directorio del proyecto:**

    ```bash
    cd cacho-game
    ```

3.  **Reemplazar los archivos:**
    Copia todos los archivos generados en esta respuesta (`index.html`, `App.tsx`, etc.) y pégalos dentro del directorio `cacho-game/src`, sobreescribiendo los archivos existentes que Vite creó. Asegúrate de mantener la estructura de directorios (`components`, `hooks`, etc.).

4.  **Instalar dependencias:**
    No se requieren dependencias externas más allá de React y ReactDOM, que ya vienen con la plantilla de Vite. Tailwind CSS se carga a través de un CDN en `index.html`.

    ```bash
    npm install
    ```

5.  **Ejecutar el servidor de desarrollo:**
    Este comando iniciará la aplicación en modo de desarrollo, generalmente en `http://localhost:5173`.

    ```bash
    npm run dev
    ```

¡Y listo! La aplicación debería estar corriendo en tu navegador.

## Próximos Pasos

Esta versión `v0` es una base funcional. Las futuras mejoras podrían incluir:

-   **Reglas de Cacho completas:** Implementar el uso de Ases (1s) como comodines.
-   **Inteligencia Artificial (IA):** Crear oponentes controlados por la computadora para que tomen decisiones de apuesta y duda.
-   **Modo multijugador en red:** Utilizar WebSockets (ej. con Socket.io) para permitir que varios jugadores se unan a una sala y jueguen en línea.
-   **Mejoras de UI/UX:** Añadir animaciones para el lanzamiento de dados, transiciones más suaves y efectos de sonido.
-   **Persistencia de estado:** Guardar el estado del juego en `localStorage` para poder continuar una partida interrumpida.
-   **Rondas especiales:** Implementar lógicas como "obligado a abrir" o rondas con reglas especiales.

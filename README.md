# D&G Bazar y Regaleria - Sistema de Gestión de Pedidos 📦

Sistema profesional diseñado para optimizar el flujo de trabajo de **D&G Bazar**, desde la recepción de pedidos hasta el despacho final.

## 🚀 Estructura del Proyecto

El repositorio está organizado siguiendo los estándares de ingeniería de software para facilitar el mantenimiento y la seguridad de los datos:

*   **/app**: Contiene el código fuente completo de la aplicación (React + TypeScript + Tailwind CSS).
    *   `App.tsx`: Lógica principal y flujos de navegación.
    *   `services/`: Integración con la API de Google Gemini para procesamiento de texto.
*   **/historico**: Carpeta destinada al almacenamiento de los respaldos de datos.
    *   Aquí es donde se deben cargar los archivos `.json` exportados semanal o mensualmente desde la aplicación.

## ✨ Funcionalidades Principales

*   🤖 **Inteligencia Artificial (Gemini API):** Análisis automático de mensajes de texto (WhatsApp/Correo) para convertirlos en listas de pedidos estructuradas.
*   📧 **Notificaciones Duales:** Sistema integrado para enviar estados de pedido mediante WhatsApp y Correo Electrónico (Gmail/Outlook).
*   📦 **Gestión de Embalaje:** Control detallado de Bolsas, Bultos y Cajas por cada pedido.
*   📍 **Ubicación en Depósito:** Registro de estanterías y pasillos para agilizar el despacho.
*   💾 **Centro de Respaldo:** Función de exportación de datos para mantener un historial físico en este repositorio.

## 🛠️ Cómo utilizar

1.  **Ingreso:** Acceda con sus credenciales de administrador.
2.  **Carga:** Utilice el "Acceso General" para pegar el texto de un pedido recibido.
3.  **Preparación:** Los operarios marcan el pedido como "Completado" una vez embalado.
4.  **Despacho:** Se notifica al cliente y se registra la salida del depósito.
5.  **Respaldo:** Periódicamente, pulse en "Exportar" dentro del Histórico y suba el archivo a la carpeta `/historico` de este GitHub.

---
**Desarrollado para D&G Bazar y Regaleria**
*Seguridad, Eficiencia y Control.*
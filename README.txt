# QR Scanner & Upload Drive

Aplicación web para la captura automática de fotos y subida a Google Drive mediante un sistema sincronizado de tableta y iPhone.

## Descripción General

Esta aplicación permite escanear códigos QR con una tableta y automáticamente capturar fotos de alta calidad con un iPhone, subiendo las imágenes directamente a Google Drive. El sistema sincroniza ambos dispositivos en tiempo real usando Firebase.

## Características Principales

- Escaneo de códigos QR desde tableta
- Captura automática de fotos en resolución (4032×3024)
- Subida automática a Google Drive
- Sincronización en tiempo real entre dispositivos
- Interfaz con enfoque en la visualización de códigos

## Requisitos

- **Hardware**:
  - Una tableta (para escanear códigos QR)
  - Un iPhone (para tomar las fotos)
  - Escáner físico de códigos QR conectado a la tableta
- **Software**:
  - Navegador web actualizado en ambos dispositivos (Safari/Chrome recomendados)
  - Cuenta de Google para autorizar acceso a Drive (sales.sunshinecowhides@gmail)
- **Conectividad**:
  - Conexión a internet estable en ambos dispositivos

## Instrucciones de Uso

### Configuración Inicial

1. Abra la aplicación en ambos dispositivos
2. En la tableta: Seleccione "Tablet"
3. En el iPhone: Seleccione "iPhone"
4. Introduzca el código mostrado en la tableta
5. En el iPhone: Inicie sesión con su cuenta de Google (sales.sunshinecowhides@gmail)
6. ¡Listo para comenzar!

### Uso - Tableta

1. Escanee un código QR con su lector físico 
2. El número principal (últimos 5 dígitos del IDH) aparecerá grande en pantalla
3. El número completo (IDH completo) aparecerá debajo
4. La aplicación notificará automáticamente al iPhone
5. El botón “Limpiar” puede usarse si el escaneo falla, permitiendo repetir el proceso de lectura.

### Uso - iPhone

1. Cuando la tableta escanea un código QR, el iPhone recibe la notificación
2. La aplicación captura automáticamente la foto
3. La foto se sube automáticamente a Google Drive
4. Una vez completada la subida, la tableta muestra confirmación
5. La aplicación queda lista para el siguiente escaneo

## Indicadores de Estado

- **Verde**: Operación completada con éxito
- **Azul**: Operación en proceso (capturando o subiendo)
- **Rojo**: Error (revise la conexión o permisos)

## Solución de Problemas

Problema = Dispositivos desconectados
Solución = Reinicie el proceso de conexión usando un nuevo código

Problema = Error de cámara
Solución = Verifique los permisos de cámara del iPhone

Problema = Error de subida
Solución = Verifique la conexión a internet y los permisos de Drive

Problema = Códigos QR no reconocidos
Solución = Asegúrese de que el formato incluya el número requerido

Problema = iPhone no detectado
Solución = Asegúrese de que ambos dispositivos estén en la misma red

## Notas Técnicas

- Las fotos se suben con calidad máxima (1.0) en formato JPEG
- Resolución objetivo: 4032×3024 píxeles
- La aplicación utiliza Firebase Realtime Database para la sincronización
- Los archivos se guardan en la carpeta específica de Google Drive configurada
- La aplicación puede variar el tiempo de subida de las fotos dependiendo de la velocidad de la conexión.
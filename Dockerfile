# Etapa 1: Compilación
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código y compilar
COPY . .
RUN npm run build -- --configuration production

# Etapa 2: Servidor
FROM nginx:alpine

# Copiar los archivos compilados desde la etapa anterior
# Revisa que la ruta 'dist/chat-app/browser' coincida con tu carpeta de salida
COPY --from=build /app/dist/chat-app/browser /usr/share/nginx/html

# Copiar configuración personalizada de nginx si es necesario
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
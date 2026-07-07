FROM node:18-alpine
WORKDIR /app

# Tutaj contextem będzie folder /client, więc kopiujemy bezpośrednio
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
# W trybie dev React używa npm start
CMD ["npm", "start"]
# Dùng Node LTS (ổn định)
FROM node:18-alpine

# Tạo thư mục trong container
WORKDIR /app

# Copy file package để cài dependency
COPY package*.json ./

# Cài dependencies (production)
RUN npm install

# Copy toàn bộ source code vào container
COPY . .

# Expose port API (ví dụ 3000)
EXPOSE 8080

# Lệnh chạy API (điều chỉnh theo file thật của bạn)
CMD ["node", "src/server.js"]

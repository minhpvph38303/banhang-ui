# 1. Chọn image Node chính thức
FROM node:22

# 2. Set thư mục làm việc trong container
WORKDIR /app

# 3. Copy package.json và package-lock.json trước
COPY package*.json ./

# 4. Cài đặt dependencies
RUN npm install

# 5. Copy toàn bộ source code vào container
COPY . .

# 6. Expose port (Node chạy port 3000)
EXPOSE 3000

# 7. Lệnh chạy khi container start
CMD ["node", "server.js"]

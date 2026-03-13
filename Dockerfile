FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json first for better cache utilization
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

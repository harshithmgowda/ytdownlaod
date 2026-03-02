# Use Node.js LTS image
FROM node:22-slim

# Install system dependencies required for yt-dlp and ffmpeg
# python3 is needed for yt-dlp
# ffmpeg is needed for media merging
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Create downloads directory directory
RUN mkdir -p downloads

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]

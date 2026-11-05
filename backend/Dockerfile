FROM oven/bun:1.2

WORKDIR /app

# Copy dependency definitions
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy application source
COPY . .

# Expose backend port
EXPOSE 3001

# Run migrations if database is ready, then launch development server
CMD ["bun", "run", "dev"]

FROM node:23.6.1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the Nuxt application
RUN npm run build

# Production image
FROM node:23.6.1-alpine AS runner

WORKDIR /app

# Copy only the output from builder
COPY --from=builder /app/.output ./

# Expose the port Nuxt uses
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

# Run the server
CMD ["node", "server/index.mjs"]

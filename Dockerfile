FROM node:23.6.1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the Nuxt application
# Force prepare after all files are copied so tsconfig.json has the correct aliases for Nuxt 4 (app/ directory)
RUN npx nuxi prepare && npm run build

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

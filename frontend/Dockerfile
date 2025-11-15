# =============================================================================
# Multi-stage Dockerfile for Next.js 16 with standalone output
# Based on official Next.js Docker example and Context7 best practices
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies - Install dependencies only when needed
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

# Install dependencies for native modules (sharp, etc.)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Enable Corepack for Yarn 4
RUN corepack enable

# Copy package files
COPY package.json yarn.lock* .yarnrc.yml* ./
# Note: .yarn directory is optional for Yarn 4 and may not exist

# Install dependencies with frozen lockfile
RUN yarn install --immutable

# -----------------------------------------------------------------------------
# Stage 2: Builder - Build the application
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Enable Corepack
RUN corepack enable

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Note: .yarn directory copy removed as it's optional and may not exist

# Copy source code
COPY . .

# Set production environment for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
# This will create .next/standalone directory with minimal dependencies
RUN yarn build

# -----------------------------------------------------------------------------
# Stage 3: Runner - Production runtime
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server and dependencies
# The standalone output includes only necessary node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static files (must be copied manually as per Next.js docs)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Set default port and hostname
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start the standalone server
CMD ["node", "server.js"]

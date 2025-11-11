# syntax=docker/dockerfile:1.7
FROM public.ecr.aws/docker/library/node:20-alpine


# Create non-root user
RUN addgroup -S app && adduser -S app -G app

# OS packages for React tooling and native module builds
RUN apk add --no-cache \
        bash \
        python3 \
        make \
        g++

WORKDIR /app


# Copy template entrypoint
COPY --chown=app:app entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh


# Bring in the app skeleton (src, bin, etc.)
COPY --chown=app:app app/ /app/

# Ensure helper scripts are executable if present
RUN if [ -d /app/bin ]; then chmod +x /app/bin/* 2>/dev/null || true; fi


USER app

ENTRYPOINT ["/entrypoint.sh"]
# Default stays idle until you add code or override CMD in compose
CMD ["idle"]

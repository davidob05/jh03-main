# syntax=docker/dockerfile:1.7
FROM alpine:3.20


# Create non-root user and workdir
RUN addgroup -S app && adduser -S app -G app
USER app
WORKDIR /app


# Copy template entrypoint
COPY --chown=app:app entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh


# Place your app code under /app when ready (COPY directives come later)
# Example (later):
# COPY --chown=app:app app/ /app/
# EXPOSE 3000


ENTRYPOINT ["/entrypoint.sh"]
# Default stays idle until you add code or override CMD in compose
CMD ["idle"]
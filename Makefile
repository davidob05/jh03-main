SHELL := /bin/bash
DEV_COMPOSE := ops/compose/docker-compose.dev.yml


.PHONY: up down logs build
up: ; docker compose -f $(DEV_COMPOSE) up -d --build || echo "No services defined yet"
down: ; docker compose -f $(DEV_COMPOSE) down -v || true
logs: ; docker compose -f $(DEV_COMPOSE) logs -f --tail=200 || echo "No services running"
build:; docker compose -f $(DEV_COMPOSE) build --pull || echo "Nothing to build"
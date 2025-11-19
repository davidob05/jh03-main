SHELL := /bin/bash
DEV_COMPOSE := ops/compose/docker-compose.dev.yml
DJANGO_DIR := services/django/lithium
DJANGO_MANAGE := ./$(DJANGO_DIR)/scripts/manage.sh


.PHONY: up down logs build reset-django-db makemigrations migrate
up:
	docker compose -f $(DEV_COMPOSE) up -d --build || echo "No services defined yet"
down: ; docker compose -f $(DEV_COMPOSE) down -v || true
logs: ; docker compose -f $(DEV_COMPOSE) logs -f --tail=200 || echo "No services running"
build:; docker compose -f $(DEV_COMPOSE) build --pull || echo "Nothing to build"
reset-django-db:
	@echo "Stopping Django service..."
	- docker compose -f $(DEV_COMPOSE) stop django >/dev/null 2>&1 || true
	@echo "Removing embedded PostgreSQL data directory..."
	rm -rf services/django/lithium/.postgres-data
	@echo "Restarting Django service with a fresh database..."
	docker compose -f $(DEV_COMPOSE) up -d django || echo "Failed to restart django service"

makemigrations:
	$(DJANGO_MANAGE) makemigrations timetabling_system

migrate: makemigrations
	$(DJANGO_MANAGE) migrate

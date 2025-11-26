SHELL := /bin/bash
DEV_COMPOSE := ops/compose/docker-compose.dev.yml
DJANGO_DIR := services/django/lithium
DJANGO_MANAGE := ./$(DJANGO_DIR)/scripts/manage.sh
FRONTEND_DIR := services/frontend/app


.PHONY: up down logs build reset-django-db makemigrations migrate
up:
	@echo "Installing frontend dependencies locally so the container can run tests without hitting the network..."
	rm -rf $(FRONTEND_DIR)/node_modules
	cd $(FRONTEND_DIR) && npm ci --no-progress --prefer-offline
	docker compose -f $(DEV_COMPOSE) up -d --build || echo "No services defined yet"
	@echo "Running frontend tests inside the container..."
	docker compose -f $(DEV_COMPOSE) exec frontend sh -lc 'set -eu; cd /app; npm test'
	@echo "Waiting for the Django virtualenv to be ready..."
	docker compose -f $(DEV_COMPOSE) exec django bash -lc 'while [ ! -x /app/.venv/bin/python ]; do sleep 2; done'
	@echo "Running Django test suite..."
	docker compose -f $(DEV_COMPOSE) exec django bash -lc '. /app/.venv/bin/activate && python manage.py test tests timetabling_system accounts'
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

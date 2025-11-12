SHELL := /bin/bash
DEV_COMPOSE := ops/compose/docker-compose.dev.yml


.PHONY: up down logs build reset-django-db migrate
up: ; docker compose -f $(DEV_COMPOSE) up -d --build || echo "No services defined yet"
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

migrate:
	@echo "Ensuring Django container is running..."
	docker compose -f $(DEV_COMPOSE) up -d django >/dev/null
	@echo "Running makemigrations + migrate inside the Django container..."
	docker compose -f $(DEV_COMPOSE) exec django bash -lc '. /app/.venv/bin/activate && python manage.py makemigrations --noinput && python manage.py migrate --noinput'

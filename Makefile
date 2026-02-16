export HOST_UID ?= $(shell id -u)
export HOST_GID ?= $(shell id -g)
export APP_PORT ?= 8000
export TMUX_VERSION ?= $(shell tmux -V 2>/dev/null | grep -oP '[\d.]+[a-z]?')

COMPOSE = HOST_UID=$(HOST_UID) HOST_GID=$(HOST_GID) APP_PORT=$(APP_PORT) TMUX_VERSION=$(TMUX_VERSION) docker compose

.PHONY: build up down restart logs health ps clean dev install up-backend down-backend logs-backend

## Docker -------------------------------------------------------

build:  ## Build Docker image
	$(COMPOSE) build

up:  ## Start container (build if needed)
	$(COMPOSE) up -d --build

down:  ## Stop and remove container
	$(COMPOSE) down

restart:  ## Restart container
	$(COMPOSE) restart

logs:  ## Follow container logs
	$(COMPOSE) logs -f

health:  ## Check health endpoint
	@curl -sf http://localhost:$(APP_PORT)/health | python3 -m json.tool

ps:  ## Show container status
	$(COMPOSE) ps

clean:  ## Stop container and remove image
	$(COMPOSE) down --rmi local

## Backend only (no frontend build) --------------------------------

up-backend:  ## Start backend-only container (no frontend build)
	$(COMPOSE) --profile backend up -d --build backend

down-backend:  ## Stop backend-only container
	$(COMPOSE) --profile backend rm -sf backend

logs-backend:  ## Follow backend-only container logs
	$(COMPOSE) --profile backend logs -f backend

## Local dev ----------------------------------------------------

install:  ## Install dependencies for local development
	npm run install:all

dev:  ## Start local dev servers (frontend:3000 + backend:8000)
	npm run dev

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help

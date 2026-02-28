export HOST_UID ?= $(shell id -u)
export HOST_GID ?= $(shell id -g)
export APP_PORT ?= 8000
export TMUX_VERSION ?= $(shell tmux -V 2>/dev/null | sed -E 's/^[^0-9]*//')
export WORKSPACE ?= $(shell pwd)

DOCKER_COMPOSE := $(shell command -v docker-compose 2>/dev/null || echo "docker compose")
COMPOSE = HOST_UID=$(HOST_UID) HOST_GID=$(HOST_GID) APP_PORT=$(APP_PORT) TMUX_VERSION=$(TMUX_VERSION) WORKSPACE=$(WORKSPACE) $(DOCKER_COMPOSE)
FLUTTER ?= flutter
FLUTTER_PORT ?= 3000

.PHONY: build up down restart logs health ps clean up-frontend flutter help

## Docker (backend) -------------------------------------------------

build:  ## Build backend Docker image
	$(COMPOSE) --profile backend build backend

up:  ## Start backend container
	$(COMPOSE) --profile backend up -d --build backend

down:  ## Stop backend container
	$(COMPOSE) --profile backend rm -sf backend

restart:  ## Restart backend container
	$(COMPOSE) --profile backend restart backend

logs:  ## Follow backend container logs
	$(COMPOSE) --profile backend logs -f backend

health:  ## Check health endpoint
	@curl -sf http://localhost:$(APP_PORT)/health | python3 -m json.tool

ps:  ## Show container status
	$(COMPOSE) --profile backend ps

clean:  ## Stop and remove image
	$(COMPOSE) --profile backend down --rmi local

## React frontend (local) -------------------------------------------

up-frontend:  ## Start React dev server (port 3000)
	cd frontend && HOST=0.0.0.0 REACT_APP_BACKEND_PORT=$(APP_PORT) npm start

## Flutter Web (local) ----------------------------------------------

flutter:  ## Start Flutter Web dev server
	cd flutter_app && $(FLUTTER) run -d web-server \
		--web-port=$(FLUTTER_PORT) --web-hostname=0.0.0.0 \
		--dart-define=BACKEND_URL=http://localhost:$(APP_PORT)

## -----------------------------------------------------------------

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help

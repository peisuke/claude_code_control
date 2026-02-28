export HOST_UID ?= $(shell id -u)
export HOST_GID ?= $(shell id -g)
export APP_PORT ?= 8000
export TMUX_VERSION ?= $(shell tmux -V 2>/dev/null | grep -oP '[\d.]+[a-z]?')

COMPOSE = HOST_UID=$(HOST_UID) HOST_GID=$(HOST_GID) APP_PORT=$(APP_PORT) TMUX_VERSION=$(TMUX_VERSION) docker compose
FLUTTER ?= flutter
FLUTTER_PORT ?= 3000

.PHONY: build up down restart logs health ps clean up-frontend flutter apk macos ios help

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

## Flutter (local) --------------------------------------------------

BACKEND_URL ?= http://localhost:$(APP_PORT)
BUILD_DATE  := $(shell date '+%m/%d %H:%M')
DART_DEFINES = --dart-define=BACKEND_URL=$(BACKEND_URL) --dart-define=BUILD_DATE="$(BUILD_DATE)"

flutter:  ## Start Flutter Web dev server
	cd flutter_app && $(FLUTTER) run -d web-server \
		--web-port=$(FLUTTER_PORT) --web-hostname=0.0.0.0 \
		$(DART_DEFINES)

apk:  ## Build debug APK (with auto build date)
	cd flutter_app && $(FLUTTER) build apk --debug $(DART_DEFINES)
	@echo "APK: flutter_app/build/app/outputs/flutter-apk/app-debug.apk"
	@echo "Build: $(BUILD_DATE)"

macos:  ## Build macOS debug app (with auto build date)
	cd flutter_app && $(FLUTTER) build macos --debug $(DART_DEFINES)
	@echo "Build: $(BUILD_DATE)"

ios:  ## Build iOS debug app (with auto build date)
	cd flutter_app && $(FLUTTER) build ios --debug --no-codesign $(DART_DEFINES)
	@echo "Build: $(BUILD_DATE)"

## -----------------------------------------------------------------

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help

THIS_FILE := $(lastword $(MAKEFILE_LIST))
.PHONY: dev dev-clean

dev:
	docker-compose --env-file .env.development up -d

dev-clean:
	docker-compose --env-file .env.development down -v --rmi local


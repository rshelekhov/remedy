.PHONY: help \
	infra-up infra-down infra-logs infra-clean \
	test-docker test-docker-run test-docker-migrate \
	test-local test-local-app test-local-run test-local-watch \
	db-migrate db-reset

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
NC     := \033[0m # No Color

help: ## Show this help
	@echo "$(GREEN)Remedy Test Commands$(NC)"
	@echo ""
	@echo "$(BLUE)Infrastructure (common):$(NC)"
	@grep -E '^infra-[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(BLUE)Docker Testing:$(NC)"
	@grep -E '^test-docker[a-zA-Z_-]*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(BLUE)Local Testing (colorized logs):$(NC)"
	@grep -E '^test-local[a-zA-Z_-]*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(BLUE)Database:$(NC)"
	@grep -E '^db-[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Infrastructure Management (Common for both Docker and Local testing)
# =============================================================================

infra-up: ## Start test infrastructure (DB, SSO, Redis, MinIO)
	@echo "$(GREEN)Starting test infrastructure...$(NC)"
	@docker compose -f docker-compose.test.yml up -d postgres-test postgres redis minio sso
	@echo "$(GREEN)Waiting for services to be ready (40s)...$(NC)"
	@sleep 30
	@echo "$(GREEN)Test infrastructure ready!$(NC)"

infra-down: ## Stop test infrastructure
	@echo "$(GREEN)Stopping test infrastructure...$(NC)"
	@docker compose -f docker-compose.test.yml down -v

infra-logs: ## Show test infrastructure logs
	@docker compose -f docker-compose.test.yml logs -f

infra-clean: ## Clean test infrastructure and volumes
	@echo "$(GREEN)Cleaning test infrastructure...$(NC)"
	@docker compose -f docker-compose.test.yml down -v --remove-orphans
	@echo "$(GREEN)Clean complete!$(NC)"

# =============================================================================
# Docker Testing
# =============================================================================

test-docker: infra-up ## Run complete Docker test suite (start infra, run tests in Docker)
	@echo "$(GREEN)Running complete Docker test suite...$(NC)"
	@$(MAKE) test-docker-migrate
	@docker compose -f docker-compose.test.yml up -d --build remedy
	@echo "$(GREEN)Waiting for remedy app to be healthy (15s)...$(NC)"
	@sleep 15
	@docker compose -f docker-compose.test.yml run --rm test-runner || (docker compose -f docker-compose.test.yml stop remedy; echo "$(YELLOW)Tests failed!$(NC)"; exit 1)
	@docker compose -f docker-compose.test.yml stop remedy
	@echo "$(GREEN)Docker test suite complete!$(NC)"

test-docker-run: ## Run integration tests in Docker (requires infra + remedy app running)
	@echo "$(GREEN)Running integration tests in Docker...$(NC)"
	@docker compose -f docker-compose.test.yml run --rm test-runner

test-docker-migrate: ## Run database migrations for test database
	@echo "$(GREEN)Running test database migrations...$(NC)"
	@DATABASE_URL=postgresql://remedy_test:remedy_test@localhost:5434/remedy_test bun prisma migrate deploy

# =============================================================================
# Local Testing (with colorized logs)
# =============================================================================

test-local: ## Local testing workflow with real-time colorized logs
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)Local Testing Workflow$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@echo ""
	@echo "$(BLUE)Step 1: Start infrastructure$(NC)"
	@echo "  $$ make infra-up"
	@echo ""
	@echo "$(BLUE)Step 2: Start remedy app (you'll see colorized logs here)$(NC)"
	@echo "  $$ make test-local-app"
	@echo ""
	@echo "$(BLUE)Step 3: Run tests (in another terminal)$(NC)"
	@echo "  $$ make test-local-run           $(YELLOW)# Single run$(NC)"
	@echo "  $$ make test-local-watch         $(YELLOW)# Watch mode (recommended)$(NC)"
	@echo ""
	@echo "$(BLUE)Cleanup:$(NC)"
	@echo "  $$ make infra-down               $(YELLOW)# Stop all infrastructure$(NC)"
	@echo ""
	@echo "$(GREEN)========================================$(NC)"

test-local-app: ## Start remedy app locally in test mode (colorized logs)
	@echo "$(GREEN)Stopping any Docker remedy containers...$(NC)"
	@docker compose -f docker-compose.test.yml stop remedy 2>/dev/null || true
	@echo "$(GREEN)Starting remedy app locally with colorized logs...$(NC)"
	@NODE_ENV=test bun --watch src/index.ts

test-local-run: ## Run integration tests locally (requires infra + local app running)
	@echo "$(GREEN)Running integration tests locally...$(NC)"
	@NODE_ENV=test bun test tests/integration

test-local-watch: ## Run tests in watch mode (requires infra + local app running)
	@echo "$(GREEN)Running tests in watch mode...$(NC)"
	@NODE_ENV=test bun test --watch tests/integration

# =============================================================================
# Database Management
# =============================================================================

db-migrate: ## Run database migrations for test database
	@echo "$(GREEN)Running test database migrations...$(NC)"
	@DATABASE_URL=postgresql://remedy_test:remedy_test@localhost:5434/remedy_test bun prisma migrate deploy

db-reset: ## Reset test database (destructive!)
	@echo "$(YELLOW)Resetting test database (destructive!)...$(NC)"
	@DATABASE_URL=postgresql://remedy_test:remedy_test@localhost:5434/remedy_test bun prisma migrate reset --force

.DEFAULT_GOAL := help

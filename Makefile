# pMusic — convenience wrappers around the npm scripts.
#
# Nothing here is required to build the project: `npm run <script>` still works
# exactly as before. These targets just give the common workflows one name each,
# and keep `code-quality` in sync with what CI runs.

NPM := npm

.DEFAULT_GOAL := help
.PHONY: help install dev build preview lint typecheck format-check code-quality fix clean

help: ## Show this help
	@echo "pMusic — available targets:"
	@echo
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo

install: ## Install dependencies from the lockfile
	$(NPM) ci

dev: ## Run the Vite dev server on http://localhost:5173
	$(NPM) run dev

build: ## Typecheck and build the production bundle into dist/
	$(NPM) run build

preview: ## Serve the built bundle on http://localhost:3000
	$(NPM) run preview

lint: ## ESLint, report only
	$(NPM) run lint

typecheck: ## TypeScript, no emit
	$(NPM) run typecheck

format-check: ## Prettier, report only
	$(NPM) run format:check

# Same three checks CI runs, plus the formatting check. Read-only: nothing here
# writes to the working tree. Use `make fix` for that.
code-quality: format-check lint typecheck ## All read-only checks (format + lint + types)
	@echo "All checks passed."

fix: ## Auto-fix what can be fixed: ESLint --fix, then Prettier --write
	$(NPM) run lint -- --fix
	$(NPM) run format

clean: ## Remove build output and installed dependencies
	rm -rf dist node_modules *.tsbuildinfo

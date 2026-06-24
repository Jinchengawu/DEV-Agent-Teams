# FundamentalsAI - Stock Analysis System
#
# Quick Start:
#   1. cp .env.example .env  (edit values)
#   2. pip install -r requirements.txt
#   3. alembic upgrade head
#   4. uvicorn src.main:app --reload --port 8000
#
# API Docs: http://localhost:8000/docs
# Health Check: http://localhost:8000/api/v1/health

.PHONY: install migrate run test lint clean

install:
	pip install -r requirements.txt

migrate:
	alembic upgrade head

run:
	uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest src/tests/ -v

lint:
	ruff check src/

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -f test.db

#!/bin/bash
# ============================================================
# run_tests.sh — единая точка запуска всех тестов AeroGuys
# ============================================================
# Использование:
#   ./run_tests.sh            — запуск unit + api тестов (без БД)
#   ./run_tests.sh --all      — запуск всех тестов включая интеграционные
#   ./run_tests.sh --backend  — только backend
#   ./run_tests.sh --frontend — только frontend
#   ./run_tests.sh --coverage — с отчётом о покрытии
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
VENV_DIR="$SCRIPT_DIR/venv"

# ─── Цвета ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERR]${NC}  $*"; }

# ─── Аргументы ────────────────────────────────────────────────────────────────
RUN_BACKEND=true
RUN_FRONTEND=true
RUN_INTEGRATION=false
RUN_COVERAGE=false

for arg in "$@"; do
    case $arg in
        --backend)  RUN_FRONTEND=false ;;
        --frontend) RUN_BACKEND=false  ;;
        --all)      RUN_INTEGRATION=true ;;
        --coverage) RUN_COVERAGE=true  ;;
        --help|-h)
            grep '^#' "$0" | sed 's/^# \?//'
            exit 0
            ;;
    esac
done

BACKEND_FAILED=0
FRONTEND_FAILED=0

# ─── Backend ──────────────────────────────────────────────────────────────────
if $RUN_BACKEND; then
    echo ""
    info "══════════════════════════════════════"
    info "   BACKEND TESTS (pytest)"
    info "══════════════════════════════════════"

    # Активируем venv
    if [ -f "$VENV_DIR/bin/activate" ]; then
        # shellcheck disable=SC1091
        source "$VENV_DIR/bin/activate"
    else
        warn "venv не найден, используем системный Python"
    fi

    cd "$BACKEND_DIR"

    PYTEST_ARGS="tests/ --ignore=tests/integration -v --tb=short"

    if $RUN_COVERAGE; then
        PYTEST_ARGS="$PYTEST_ARGS --cov=src --cov-report=term-missing --cov-report=html:coverage_html"
    fi

    if $RUN_INTEGRATION; then
        PYTEST_ARGS="tests/ -v --tb=short"
        export INTEGRATION_TESTS=1
        info "Интеграционные тесты включены (INTEGRATION_TESTS=1)"
    fi

    if python -m pytest $PYTEST_ARGS; then
        success "Backend tests PASSED"
    else
        error "Backend tests FAILED"
        BACKEND_FAILED=1
    fi

    cd "$SCRIPT_DIR"
fi

# ─── Frontend ─────────────────────────────────────────────────────────────────
if $RUN_FRONTEND; then
    echo ""
    info "══════════════════════════════════════"
    info "   FRONTEND TESTS (vitest)"
    info "══════════════════════════════════════"

    cd "$FRONTEND_DIR"

    if $RUN_COVERAGE; then
        VITEST_CMD="npm run test:coverage"
    else
        VITEST_CMD="npm run test"
    fi

    if $VITEST_CMD; then
        success "Frontend tests PASSED"
    else
        error "Frontend tests FAILED"
        FRONTEND_FAILED=1
    fi

    cd "$SCRIPT_DIR"
fi

# ─── Итог ─────────────────────────────────────────────────────────────────────
echo ""
info "══════════════════════════════════════"
info "   РЕЗУЛЬТАТЫ"
info "══════════════════════════════════════"

if $RUN_BACKEND; then
    if [ $BACKEND_FAILED -eq 0 ]; then
        success "Backend:  PASSED ✓"
    else
        error   "Backend:  FAILED ✗"
    fi
fi

if $RUN_FRONTEND; then
    if [ $FRONTEND_FAILED -eq 0 ]; then
        success "Frontend: PASSED ✓"
    else
        error   "Frontend: FAILED ✗"
    fi
fi

TOTAL_FAILED=$((BACKEND_FAILED + FRONTEND_FAILED))
if [ $TOTAL_FAILED -eq 0 ]; then
    echo ""
    success "Все тесты прошли успешно! 🎉"
    exit 0
else
    echo ""
    error "Обнаружены ошибки в тестах ($TOTAL_FAILED пакет(ов) с ошибками)"
    exit 1
fi

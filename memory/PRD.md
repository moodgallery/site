# Personal Operating System - PRD

## Problem Statement
Мобільний та веб-застосунок Personal Operating System для відстеження фінансів, цілей, звичок, розпорядку дня та виконаних завдань. Персональна система продуктивності.

## Architecture
- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT + Google OAuth (Emergent Auth)
- **AI**: Claude Sonnet 4.5 (via Emergent LLM Key)

## User Personas
- Продуктивні професіонали, які хочуть оптимізувати дохід, дисципліну та продуктивність

## Core Requirements
1. Трекер фінансів (доходи/витрати, категорії, графіки, цілі)
2. Система цілей (категорії, етапи, прогрес)
3. Трекер звичок (щоденні відмітки, streak, календар)
4. Менеджер завдань (пріоритети, drag-and-drop, категорії)
5. Щоденний розклад (time blocking)
6. Щотижневий огляд (AI аналітика, рефлексія)
7. Головний дашборд

## What's Implemented (Jan 2026)
- [x] Авторизація (JWT + Google OAuth)
- [x] Дашборд з усіма віджетами
- [x] Фінансовий модуль (транзакції, графіки, цілі)
- [x] Система цілей (CRUD, milestones, прогрес)
- [x] Трекер звичок (щоденні відмітки, streak, календар)
- [x] Менеджер завдань (CRUD, drag-drop, пріоритети)
- [x] Розклад (time blocking)
- [x] Огляд тижня (аналітика, AI звіт, рефлексія)
- [x] AI асистент (Claude Sonnet 4.5)
- [x] **NEW**: Управління валютою (USD, EUR, UAH, GBP, PLN)
- [x] **NEW**: Управління категоріями (додавання/редагування/видалення)
- [x] **NEW**: Сторінка налаштувань

## Backlog (P0-P2)
### P0 (Critical)
- None

### P1 (High)
- Push-сповіщення (браузер)
- Експорт даних (CSV/PDF)

### P2 (Nice to have)
- Синхронізація з Google Calendar
- Нагадування через email/SMS
- Темна/світла тема перемикач
- PWA для мобільних

## Next Tasks
1. Додати push-сповіщення для нагадувань
2. Експорт фінансових даних у CSV
3. PWA manifest для мобільної оптимізації

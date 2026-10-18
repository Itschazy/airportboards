# AGENTS.md — airportsboard.live

Codex и любой другой агент: **сначала прочитай `CLAUDE.md`** — это основная инструкция проекта
(деньги, сеть, сервер, выкат, проверки). Здесь только то, без чего нельзя начать.

1. **Текущая работа и план — в `HANDOFF.md`.** Там сделанное, следующий шаг и как проверять.
   Перед началом сверь его с `git log` — он мог устареть на пару коммитов.
2. **Деньги.** Не запрашивай `/api/flights/*` и `/api/cron/warm` на проде и не шли туда браузерный
   User-Agent: это покупает данные у airlabs. Мерить прод — только `curl -A "audit-bot"`.
3. **Сайт в браузере не открывать.** Смотреть интерфейс — локально, на фикстуре без ключа:
   ```bash
   node scripts/make-fixture-store.mjs /tmp/f.json
   FLIGHT_STORE_PATH=/tmp/f.json AIRPORTSBOARD_DATA_DIR=/tmp/abdata AIRLABS_API_KEY= CRON_TOKEN=localtest \
     NEXT_DIST_DIR=.next-dev npx next dev -p 3099
   ```
   После — `rm -rf .next-dev && git checkout tsconfig.json next-env.d.ts`.
4. **12 локалей обязаны быть ключ-в-ключ** (`messages/*.json`). Новая строка — во все 12 сразу.
5. **Выкат — пуш в `main`** (GitHub Actions → сервер Timeweb 217.149.26.240). Отдельной команды нет.
   Сервер: `ssh root@217.149.26.240` / `ssh deploy@217.149.26.240` (ключ владельца).
6. Коммиты — по-русски, с причиной в теле, как в истории репозитория.

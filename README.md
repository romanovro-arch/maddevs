<p align="center">
  <a href="https://github.com/romanovro-arch/maddevs">
    <img src="https://img.shields.io/badge/MadEvents-Event_Registration_Platform-6366f1?style=for-the-badge&logo=ticketmaster&logoColor=white" alt="MadEvents" />
  </a>
</p>

<h1 align="center">⚡ MadEvents — Сервис регистрации на мероприятия</h1>

<p align="center">
  <b>Высоконагруженный сервис регистрации и контроля доступа с гарантией от состояния гонки (Race Condition), автоматическим листом ожидания (FIFO), однократным чекином и live-дашбордом организатора.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-Bun%201.4-000000?style=flat-square&logo=bun&logoColor=white" alt="Bun" />
  <img src="https://img.shields.io/badge/Backend-Hono%20v4-E36002?style=flat-square&logo=hono&logoColor=white" alt="Hono" />
  <img src="https://img.shields.io/badge/ORM-Drizzle%20SQLite%20(WAL)-C5F74F?style=flat-square&logo=sqlite&logoColor=black" alt="Drizzle" />
  <img src="https://img.shields.io/badge/Frontend-Next.js%2016-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/UI-shadcn%2Fui%20(Tailwind%20v4)-000000?style=flat-square&logo=shadcnui&logoColor=white" alt="shadcn" />
  <img src="https://img.shields.io/badge/Realtime-WebSockets-2563EB?style=flat-square" alt="WebSockets" />
  <img src="https://img.shields.io/badge/Tests-Passing%20(6%2F6)-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
</p>

---

## 📋 Таблица соответствия требованиям (Задание 9)

| Требование ТЗ | Как реализовано | Где проверить в коде |
| :--- | :--- | :--- |
| **Событие**: описание, дата и время, лимит мест | Таблица `events` в SQLite, модалка создания, карточки событий с прогресс-барами | [`backend/src/services/event.service.ts`](backend/src/services/event.service.ts), [`CreateEventDialog.tsx`](frontend/apps/web/components/CreateEventDialog.tsx) |
| **Регистрация по email, отказ от участия** | Эндпоинты `/api/registrations` и `/cancel`, форма с анимацией конфетти, кнопка отказа на билете | [`backend/src/services/registration.service.ts`](backend/src/services/registration.service.ts), [`TicketCard.tsx`](frontend/apps/web/components/TicketCard.tsx) |
| **Лист ожидания при исчерпании мест** | При `confirmed >= capacity` регистрация переходит в статус `WAITLIST` с номером очереди | [`backend/src/services/registration.service.ts`](backend/src/services/registration.service.ts) |
| **Билет с кодом и экран чекина на входе** | Векторный QR-код (`qrcode.react`) + буквенно-цифровой код (`MAD-XXXXXX`) + экран сканера `/checkin` со звуком | [`TicketCard.tsx`](frontend/apps/web/components/TicketCard.tsx), [`checkin/page.tsx`](frontend/apps/web/app/events/[id]/checkin/page.tsx), [`lib/sound.ts`](frontend/apps/web/lib/sound.ts) |
| **Экран организатора**: сколько зарегистрировано, в waitlist, пришло | 4 виджета со статистикой, график **AreaChart** динамики проходов, таблицы участников и waitlist | [`dashboard/page.tsx`](frontend/apps/web/app/events/[id]/dashboard/page.tsx), [`AttendanceAreaChart.tsx`](frontend/apps/web/components/AttendanceAreaChart.tsx) |
| **Защита от дублей email** | Составной уникальный индекс `UNIQUE(event_id, email)`. Повторный ввод возвращает существующий билет | [`backend/src/db/schema.ts`](backend/src/db/schema.ts) |
| **Авто-продвижение из листа ожидания** | При отмене участника транзакция находит первого кандидата (`ORDER BY createdAt ASC LIMIT 1`), делает его `CONFIRMED` и генерирует билет | [`backend/src/services/registration.service.ts`](backend/src/services/registration.service.ts) |
| **Race Condition: два человека на последнее место** | Атомарная транзакция SQLite (`db.transaction` в режиме `IMMEDIATE`), последовательная обработка очереди бронирования | [`backend/src/services/registration.service.ts`](backend/src/services/registration.service.ts), [`concurrency.test.ts`](backend/tests/concurrency.test.ts) |
| **Напоминание за сутки (ровно одно)** | Фоновый планировщик с транзакционной фиксацией флага `reminder24hSent = true` | [`backend/src/services/scheduler.service.ts`](backend/src/services/scheduler.service.ts) |
| **Однократный чекин билета** | Атомарный апдейт статуса `ISSUED` $\to$ `CHECKED_IN`. При повторном вводе возвращается ошибка с временем первого входа | [`backend/src/services/checkin.service.ts`](backend/src/services/checkin.service.ts) |
| **Live-счётчик пришедших** | Нативные WebSockets в Hono (`/ws?eventId=...`). При каждом чекине статистика пушится организатору в реальном времени | [`backend/src/ws/live-stats.ts`](backend/src/ws/live-stats.ts), [`useEventLiveStats.ts`](frontend/apps/web/hooks/useEventLiveStats.ts) |
| **Организатор перенёс событие — все получают письмо** | Эндпоинт `PATCH /api/events/:id` автоматически рассылает письма всем активным участникам с новой датой | [`backend/src/services/event.service.ts`](backend/src/services/event.service.ts), [`RescheduleDialog.tsx`](frontend/apps/web/components/RescheduleDialog.tsx) |
| **Виртуальный почтовый ящик (Dev Mailbox)** | Плавающий виджет со всеми отправленными письмами, прямыми ссылками на билеты и кнопкой теста планировщика | [`DevMailboxDrawer.tsx`](frontend/apps/web/components/DevMailboxDrawer.tsx) |

---

## ⚡ Руководство по запуску

### Системные требования
- [Bun](https://bun.sh) (`>= 1.4.0`)
- Node.js (`>= 20.9.0`)
- Git

### 1. Клонирование и установка зависимостей
```bash
git clone https://github.com/romanovro-arch/maddevs.git
cd maddevs
bun run install:all
```

### 2. Запуск демо-данных (сидинг)
Создаёт демонстрационное событие с заполненными местами и участниками в листе ожидания:
```bash
bun run seed
```

### 3. Запуск обеих систем (одной командой)
```bash
bun run dev
```
> Команда запускает параллельно через `concurrently`:
> - 🟢 **Frontend UI**: [http://localhost:3000](http://localhost:3000)
> - 🟣 **Backend API & WebSockets**: [http://localhost:3001](http://localhost:3001)

*(При желании можно запускать в раздельных терминалах: `bun --cwd backend run dev` и `bun --cwd frontend run dev`)*.

---

## 🧪 Запуск тестов конкурентности (Race Condition)

Запуск тестового набора на Bun (20 одновременных запросов на 2 места, проверка FIFO waitlist, однократного чекина и планировщика):

```bash
bun run test
```

Результат:
```text
tests\concurrency.test.ts:
(pass) 1. RACE CONDITION TEST: 20 simultaneous registrations for 2 spots [957ms]
(pass) 2. DUPLICATE EMAIL TEST: Duplicate registration with the same email does not create a second seat [1.6ms]
(pass) 3. WAITLIST PROMOTION TEST: Cancellation auto-promotes first in waitlist (FIFO) [37ms]
(pass) 4. SINGLE CHECK-IN TEST: Ticket can be checked in only once [17ms]
(pass) 5. SCHEDULER TEST: Exactly ONE 24h reminder is sent [173ms]
(pass) 6. RESCHEDULE TEST: All participants receive notification when event is rescheduled [392ms]

 6 pass, 0 fail, 25 expect() calls [1.8s]
```

---

## 🧭 Пошаговый сценарий проверки для ревьюера

1. **Создание события**:
   - Откройте `http://localhost:3000`.
   - Нажмите `+ Создать событие`, задайте название, лимит `2 места` и дату.
2. **Регистрация и переполнение**:
   - Зарегистрируйте `user1@test.com` и `user2@test.com` $\to$ получите билеты с QR-кодами.
   - Зарегистрируйте `user3@test.com` $\to$ увидите статус *«Места закончились. Вы в листе ожидания под №1»*.
3. **Чекин на входе**:
   - Откройте экран чекина события `/events/:id/checkin`.
   - Введите код первого билета $\to$ зелёный экран *«ПРОХОД РАЗРЕШЕН»* + приятный аудиосигнал.
   - Введите этот же код повторно $\to$ красный экран *«ПОВТОРНЫЙ ВХОД ЗАПРЕЩЕН!»* + сигнал ошибки.
4. **Live-дашборд организатора**:
   - Откройте дашборд `/events/:id/dashboard`.
   - Проверьте счётчик «Пришло» и график `AreaChart` (обновляются моментально через сокеты).
   - Нажмите `Экспорт CSV`, чтобы скачать файл участников.
5. **Отказ от участия и авто-продвижение**:
   - Откройте страницу билета второго участника `/tickets/:code`.
   - Нажмите «Отказаться от участия» $\to$ билет аннулируется, а `user3@test.com` из листа ожидания автоматически получает подтверждённое место!
6. **Виртуальная почта (Dev Mailbox)**:
   - Нажмите круглую кнопку `Dev Mailbox` в правом нижнем углу любого экрана, чтобы увидеть все отправленные письма и протестировать напоминания за 24 часа.

---

<p align="center">
  <sub>Сделано с любовью для MadDevs Engineering Challenge.</sub>
</p>

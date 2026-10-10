# Portfolio

Шесть интерактивных проектов на HTML, CSS и JavaScript, опубликованные через GitHub Pages.

**Открыть портфолио:** https://pollarddrallop.github.io/portfolio/

| Проект                                      | Открыть сайт                                                               | Исходники                                 |
| ------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| Aether Incident Lab — 103 учебных инцидента | [Aether](https://pollarddrallop.github.io/portfolio/site1-cyberpunk/)      | [site1-cyberpunk](site1-cyberpunk/)       |
| Kairos — редактор комнат и фасадов дома     | [Kairos](https://pollarddrallop.github.io/portfolio/site2-architecture/)   | [site2-architecture](site2-architecture/) |
| Retro Tanks — танковая аркада               | [Retro Tanks](https://pollarddrallop.github.io/portfolio/site3-synthwave/) | [site3-synthwave](site3-synthwave/)       |
| ROOM 404 — комната-загадка                  | [ROOM 404](https://pollarddrallop.github.io/portfolio/site4-hush/)         | [site4-hush](site4-hush/)                 |
| DEEP RUN — управляемая подводная аркада     | [DEEP RUN](https://pollarddrallop.github.io/portfolio/site5-abyss/)        | [site5-abyss](site5-abyss/)               |
| FLUX — физическая песочница                 | [FLUX](https://pollarddrallop.github.io/portfolio/site6-forma/)            | [site6-forma](site6-forma/)               |

## Локальный запуск

Из корня репозитория: `python3 -m http.server 8765`. Затем откройте http://localhost:8765/.

## Обновления

Каждый push в `main` автоматически публикует все шесть сайтов. Настройка — [.github/workflows/pages.yml](.github/workflows/pages.yml). Backend и этап сборки не требуются. Прогресс и варианты сохраняются в localStorage браузера. Aether — учебная модель; Kairos — концептуальный эскиз с условной моделью стоимости.

## Ресурсы

Локальные шрифты Aether и Kairos сопровождаются лицензиями OFL. Three.js распространяется под MIT, уведомление сохранено в библиотеке. Фото Kairos: [вилла](https://images.unsplash.com/photo-1600585154340-be6161a56a0c) и [интерьер](https://images.unsplash.com/photo-1600607687939-ce8a6c25118c) из Unsplash. Retro Tanks использует Google Fonts с системными резервными шрифтами.

ROOM 404 сохраняет найденные улики и финал в браузере. DEEP RUN — новая экспедиция при каждом запуске: WASD / стрелки, пробел — ускорение, E — сонар, P — пауза; на телефоне есть кнопки. FLUX — эксперименты с импульсами, маятниками и центральной силой, рисунки из шаров и экспорт кадра в PNG. Состояние экспедиции и физической сцены не сохраняется между перезагрузками.

Три новых проекта используют общую локальную Three.js и шрифты из `shared/`. Для DEEP RUN и FLUX нужен WebGL; ROOM 404 можно пройти кнопками и при недоступной 3D-сцене. Первые три сайта сохранены без изменений. URL новых проектов сохранены для существующих ссылок.

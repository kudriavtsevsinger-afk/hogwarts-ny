import { createPreview } from './real-avatar/preview.js';

export function createAvatar(container, initialCharacter) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  canvas.setAttribute('aria-label', 'Трёхмерный предпросмотр персонажа');
  const status = document.createElement('div');
  status.setAttribute('role', 'status');
  status.textContent = 'Загружаем 3D-модель…';
  container.append(canvas, status);
  let selection = 0;
  let timer;
  const assets = new URL('./real-avatar/', import.meta.url).href;
  const preview = createPreview(canvas, assets, true);
  preview.catch(() => { status.textContent = 'Не удалось загрузить 3D-модель. Обнови страницу, чтобы повторить.'; });

  function update(character) {
    const current = ++selection;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const show = await preview;
        if (current !== selection) return;
        await show(character, () => current === selection);
        if (current === selection) status.textContent = '';
      } catch (error) {
        console.error(error);
        if (current === selection) status.textContent = 'Не удалось показать 3D-модель.';
      }
    }, 120);
  }
  update(initialCharacter);
  return { update, focusFace(value) { preview.then(show => show.focusFace(value)).catch(() => {}); } };
}

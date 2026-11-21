import {DEFAULT_CHARACTER, request, stars} from './common.js';

stars('stars', 65);
const code = String(new URLSearchParams(location.search).get('room') || '').toUpperCase();
const characters = document.getElementById('characters');
const canvas = document.getElementById('scene-avatar');
const status = document.getElementById('scene-avatar-status');
let preview;
let selection = 0;

async function showCharacter(character, button) {
  const current = ++selection;
  for (const option of characters.querySelectorAll('button')) {
    option.setAttribute('aria-pressed', String(option === button));
  }
  status.textContent = 'Загружаем персонажа…';
  canvas.style.visibility = 'hidden';
  try {
    preview ??= import('./real-avatar/preview.js')
      .then(module => module.createPreview(canvas, new URL('./real-avatar/', import.meta.url).href))
      .catch(error => { preview = undefined; throw error; });
    const show = await preview;
    if (current !== selection) return;
    await show({...DEFAULT_CHARACTER, ...character}, () => current === selection);
    if (current !== selection) return;
    canvas.style.visibility = '';
    status.textContent = '';
  } catch (error) {
    console.error(error);
    if (current === selection) status.textContent = 'Не удалось показать персонажа. Нажми на имя, чтобы повторить.';
  }
}

if (/^[A-Z0-9]{6}$/.test(code)) {
  request('/api/rooms/' + code).then(({state}) => {
    for (const player of state.players) {
      if (!player.character?.base) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option';
      button.textContent = player.character.name || player.name;
      button.addEventListener('click', () => showCharacter(player.character, button));
      characters.append(button);
    }
    if (characters.firstElementChild) {
      canvas.hidden = false;
      characters.firstElementChild.click();
    }
  }).catch(() => { status.textContent = 'Не удалось загрузить игроков комнаты.'; });
}

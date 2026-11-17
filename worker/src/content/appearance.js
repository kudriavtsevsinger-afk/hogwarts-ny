// Контент внешности персонажа (конструктор "как в Симс") и таблица способностей.
// Картинки сюда не встроены — пока используются текстовые метки/цвета-плейсхолдеры.
// Когда будут готовы графические слои, у каждого option достаточно добавить поле `image`.

export const APPEARANCE_CATEGORIES = [
  {
    id: 'face',
    label: 'Форма лица',
    options: [
      { id: 'face_oval', label: 'Овальное', tags: ['classic'] },
      { id: 'face_sharp', label: 'Угловатое', tags: ['bold'] },
      { id: 'face_round', label: 'Округлое', tags: ['soft'] },
      { id: 'face_heart', label: 'Сердцевидное', tags: ['mystic'] },
    ],
  },
  {
    id: 'eyebrows',
    label: 'Брови',
    options: [
      { id: 'brows_straight', label: 'Прямые', tags: ['calm'] },
      { id: 'brows_arched', label: 'Выгнутые', tags: ['sly'] },
      { id: 'brows_thick', label: 'Густые', tags: ['bold'] },
      { id: 'brows_thin', label: 'Тонкие', tags: ['elegant'] },
    ],
  },
  {
    id: 'eyes',
    label: 'Глаза',
    options: [
      { id: 'eyes_sharp', label: 'Пронзительные', tags: ['perception'] },
      { id: 'eyes_warm', label: 'Тёплые', tags: ['charm'] },
      { id: 'eyes_mysterious', label: 'Загадочные', tags: ['mystic'] },
      { id: 'eyes_bright', label: 'Яркие', tags: ['luck'] },
    ],
  },
  {
    id: 'nose',
    label: 'Нос',
    options: [
      { id: 'nose_straight', label: 'Прямой', tags: ['classic'] },
      { id: 'nose_regal', label: 'Благородный', tags: ['sly'] },
      { id: 'nose_small', label: 'Маленький', tags: ['soft'] },
      { id: 'nose_distinct', label: 'Выразительный', tags: ['bold'] },
    ],
  },
  {
    id: 'lips',
    label: 'Губы',
    options: [
      { id: 'lips_smirk', label: 'С лукавой улыбкой', tags: ['sly'] },
      { id: 'lips_full', label: 'Полные', tags: ['charm'] },
      { id: 'lips_thin', label: 'Тонкие', tags: ['calm'] },
      { id: 'lips_bright', label: 'Яркие', tags: ['bold'] },
    ],
  },
  {
    id: 'makeup',
    label: 'Макияж',
    options: [
      { id: 'makeup_none', label: 'Без макияжа', tags: ['classic'] },
      { id: 'makeup_smokey', label: 'Дымчатый', tags: ['mystic'] },
      { id: 'makeup_sparkle', label: 'С блёстками', tags: ['luck'] },
      { id: 'makeup_bold', label: 'Яркий', tags: ['bold'] },
    ],
  },
  {
    id: 'hair',
    label: 'Причёска',
    options: [
      { id: 'hair_long', label: 'Длинные волосы', tags: ['elegant'] },
      { id: 'hair_short', label: 'Короткая стрижка', tags: ['calm'] },
      { id: 'hair_curly', label: 'Кудри', tags: ['charm'] },
      { id: 'hair_wild', label: 'Растрёпанные', tags: ['bold'] },
    ],
  },
  {
    id: 'outfit',
    label: 'Одежда',
    options: [
      { id: 'outfit_robe_black', label: 'Классическая мантия', tags: ['classic'] },
      { id: 'outfit_robe_green', label: 'Мантия со змеиным шармом', tags: ['sly'] },
      { id: 'outfit_festive', label: 'Праздничный наряд', tags: ['luck'] },
      { id: 'outfit_scholar', label: 'Строгий учёный костюм', tags: ['perception'] },
    ],
  },
];

// Способности: у каждой — список тегов, с которыми она "резонирует" (увеличивает вес при розыгрыше).
export const ABILITIES = [
  {
    id: 'keen_sight',
    name: 'Чуткость',
    desc: 'Один раз за игру видит дополнительный фрагмент-подсказку в головоломке с шифром.',
    tagMatch: ['perception', 'mystic'],
  },
  {
    id: 'ny_luck',
    name: 'Новогоднее везение',
    desc: 'Один раз можно пропустить неверный ответ без потери времени.',
    tagMatch: ['luck'],
  },
  {
    id: 'slytherin_charm',
    name: 'Шарм подземелий',
    desc: 'Один раз открывает альтернативную реплику в диалоговой развилке.',
    tagMatch: ['sly', 'charm'],
  },
  {
    id: 'speed_read',
    name: 'Скорочтение',
    desc: 'Подсказки для этого игрока стоят вполовину дешевле.',
    tagMatch: ['elegant', 'classic'],
  },
  {
    id: 'steady_hand',
    name: 'Твёрдая рука',
    desc: 'В мини-играх на точность — одна дополнительная попытка.',
    tagMatch: ['bold'],
  },
  {
    id: 'cold_calm',
    name: 'Хладнокровие',
    desc: 'Не считается первая ошибка в игре на время.',
    tagMatch: ['calm'],
  },
  {
    id: 'lucky_galleon',
    name: 'Счастливый галеон',
    desc: 'Команда начинает игру с бонусом +3 монеты в общую казну.',
    tagMatch: ['luck', 'classic'],
  },
  {
    id: 'curious_mind',
    name: 'Пытливый ум',
    desc: 'Один раз открывает скрытую деталь сцены без траты монет.',
    tagMatch: ['perception', 'soft'],
  },
];

// Детерминированный выбор "случайной" способности: чем больше совпавших тегов,
// тем выше вес способности — но всегда остаётся элемент случайности.
export function rollAbility(appearance) {
  const chosenTags = new Set();
  for (const categoryId of Object.keys(appearance || {})) {
    const category = APPEARANCE_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) continue;
    const option = category.options.find((o) => o.id === appearance[categoryId]);
    if (option) option.tags.forEach((t) => chosenTags.add(t));
  }

  const weighted = [];
  for (const ability of ABILITIES) {
    const matches = ability.tagMatch.filter((t) => chosenTags.has(t)).length;
    const weight = 1 + matches * 3; // базовый вес 1 + бонус за совпадения
    for (let i = 0; i < weight; i++) weighted.push(ability);
  }
  const picked = weighted[Math.floor(Math.random() * weighted.length)];
  return picked || ABILITIES[0];
}

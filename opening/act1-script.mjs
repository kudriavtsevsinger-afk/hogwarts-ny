const names={dumbledore:'Дамблдор',mcgonagall:'Макгонагалл',vendor:'Продавщица',peeves:'Пивз',portrait:'Портрет',clock:'Часы'};
const shot=(id,kind,extra={})=>({id,kind,chapter:7,background:'tower',music:'tension',...extra});
const line=(id,actor,text,extra={})=>shot(id,'line',{actor,speaker:names[actor],text,expression:actor==='dumbledore'?'concerned':'neutral',durationMs:Math.max(4200,text.length*65),...extra});
export const ACT1_SCRIPT=[
 shot('act-title','title',{title:'АКТ I',subtitle:'Часовая башня',durationMs:5000,background:null,music:null,cue:'bell',cueDuration:1.2}),
 shot('vestibule-return','travel',{background:'vestibule',durationMs:4500,music:'tension'}),
 line('dumbledore-request-1','dumbledore','Друзья мои. Официально я не имею права просить вас о помощи. Вы мои гости, а гости не отвечают за порядок в доме хозяев.',{background:'vestibule',framing:'wide'}),
 line('dumbledore-request-2','dumbledore','Но я наслышан о вас. Говорят, вы сильные волшебники, и в трудную минуту на вас можно положиться. Поэтому я всё-таки прошу. Помогите спасти Новый год и Хогвартс. Полночь должна вернуться.',{background:'vestibule'}),
 line('dumbledore-tower','dumbledore','Начнём с башни. Часы там замолчали первыми.',{background:'vestibule'}),
 shot('mission','ready',{title:'Вернуть полночь',instruction:'Первая остановка — Часовая башня.',background:'vestibule'}),
 shot('corridor-journey','travel',{background:'corridor',durationMs:5500,music:'calm'}),
 line('vendor-greeting','vendor','Ой, а у вас тут как интересно! Часы стоят, портреты шепчутся, и никто не догадался спросить у меня, нужно ли что-нибудь.',{background:'corridor',music:'calm'}),
 line('vendor-offer','vendor','Берите, что вам понадобится. Заплатить можно из общего банка. Оплата, как вы понимаете, не моя забота, а ваша.',{background:'corridor',music:'calm'}),
 shot('shop','shop',{title:'Тележка продавщицы',instruction:'Покупки общие. Решение принимают 60% участников.',background:'corridor',music:'calm'}),
 line('vendor-farewell','vendor','Удачи в башне. Там сегодня очень сердитый призрак.',{background:'corridor',music:'calm'}),
 shot('tower-approach','travel',{background:'corridor',durationMs:5500}),
 line('mcgonagall-warning','mcgonagall','Пивз сегодня особенно шумный. Не отвлекайтесь на него. Он этого и добивается.',{background:'corridor'}),
 line('mcgonagall-advice','mcgonagall','Хотя, если он вас всё-таки заметит, отвечать не обязательно. Он не слушает ответов.',{background:'corridor'}),
 shot('tower-entrance','travel',{background:'tower',durationMs:4500}),
 shot('hunt-rules','ready',{title:'Охота на Пивза',instruction:'На телефоне — твои ниши. Коснись Пивза, пока он не исчез. 60 секунд, цель — 8 поимок. За 10 и больше — 2 монеты.'}),
 line('peeves-start','peeves','Ах, гости! Игра в прятки! Мои любимые! Вы водите, а я прячусь, и никто меня не найдёт! Хи-хи!',{music:'joy'}),
 shot('hunt','hunt',{title:'Охота на Пивза',instruction:'Лови Пивза в своих нишах на телефоне.',music:'joy'}),
 line('peeves-result','peeves','Ладно. Вот записка. Больше не просите.',{music:'calm'}),
 shot('note','note',{title:'Записка Пивза',music:'calm'}),
 line('gallery-invitation','mcgonagall','Пивз исчез, а портреты вдруг притихли. Кажется, теперь они ждут вашего вопроса.',{background:'corridor'}),
 shot('gallery-journey','travel',{background:'corridor',durationMs:5000,music:'ambient-3'}),
 shot('portraits','portraits',{title:'Ребус портретов',instruction:'Открой картину на телефоне и наведи камеру на распечатанный портрет. Решите все шесть загадок.',background:'corridor',music:'ambient-3'}),
 shot('chest','chest',{title:'Сундук открыт',instruction:'Внутри — ключ от механизма башни.',durationMs:4500,cue:'unlock',cueDuration:1.4}),
 line('dumbledore-key','dumbledore','Вот и ключ. Не тот, что отпирает двери. Тот, что заводит часы.',{expression:'smile'}),
 shot('mechanism-approach','travel',{background:'tower',durationMs:5500}),
 line('mechanism-explanation','dumbledore','У этого механизма всё связано. Повернёте одну шестерёнку — две соседние пойдут в обратную сторону. Сначала попробуйте без спешки.'),
 shot('gear-rules','practice',{title:'Почувствуйте механизм',instruction:'Это тренировка без таймера. Нажми свою шестерёнку: она сдвинется вперёд, две соседние — назад. Затем нажми «Понятно».'}),
 ...[1,2,3].flatMap(round=>[
 line('gear-intro-'+round,'dumbledore',round===1?'Совместите стрелки с золотыми отметками. Не спешите: иногда, чтобы помочь соседу, приходится сделать шаг назад.':round===2?'Механизм стал капризнее. Это хороший знак. Значит, он ещё помнит, как работать.':'Одна шестерёнка заклинена. Не тратьте на неё время. Её нельзя починить, её можно только обойти.'),
 shot('gear-memory-'+round,'memory',{round,title:'Настройка механизма',instruction:'Золотая метка — цель. Совместите с ней стрелку каждой шестерёнки.'}),
 shot('gear-play-'+round,'gears',{round,title:'Шестерёнки часов',instruction:'Совместите стрелки с золотыми метками. Свою поворачиваешь вперёд — две соседние идут назад.'}),
 line('gear-won-'+round,'dumbledore',round===1?'Один шаг. Хорошо. Дальше будет труднее.':round===2?'Хорошо. Осталось обойти последнее препятствие.':'Замечательно. Механизм помнит, что он часы.',{expression:'smile',cue:'success',cueDuration:3})
 ]),
 shot('first-bell','bell',{title:'Первый колокол',durationMs:4500,music:null,cue:'bell',cueDuration:1.5}),
 line('end-bell','dumbledore','Колокол не дозвонил. Значит, часть полуночи действительно осталась здесь.',{music:null}),
 line('end-mystery','dumbledore','Кто-то не хотел, чтобы этот звон прозвучал. Это уже не похоже на случайность.',{music:null}),
 shot('act-result','ready',{title:'Первый колокол: 1 из 5',instruction:'Одна часть полуночи осталась в башне.',music:null}),
 shot('act2-title','end',{title:'АКТ II',subtitle:'Зимняя теплица',background:null,music:null})
];
export const ITEMS=[
 {id:'watch',name:'Карманные часы «Тик-так»',cost:2,description:'Немного времени про запас. Иногда это самое ценное.',image:'/art/act1/props/watch.webp'},
 {id:'magnifier',name:'Лупа Слизнорта',cost:3,description:'Помогает увидеть то, что ускользает от взгляда.',image:'/art/act1/props/magnifier.webp'},
 {id:'note',name:'Запечатанный свиток',cost:1,description:'Чужой секрет, бережно свёрнутый в пергамент.',image:'/art/act1/props/note.webp'}
];
export const LEGACY_ACT1_IDS=["act-title", "act-silence", "dumbledore-request-1", "dumbledore-request-2", "dumbledore-tower", "mission", "vendor-greeting", "vendor-offer", "shop", "vendor-farewell", "mcgonagall-warning", "mcgonagall-advice", "hunt-rules", "peeves-start", "hunt", "peeves-result", "note", "portraits", "chest", "dumbledore-key", "gear-rules", "gear-intro-1", "gear-memory-1", "gear-play-1", "gear-won-1", "gear-intro-2", "gear-memory-2", "gear-play-2", "gear-won-2", "gear-intro-3", "gear-memory-3", "gear-play-3", "gear-won-3", "first-bell", "end-bell", "end-mystery", "act-result", "act2-title"];
export const PAINTINGS=[
 ['https://ar.letary.ru/vRqTM','ЗЕРКАЛО','З'],['https://letary.ru/p/i0Xdf','ВРЕМЯ','В'],['https://letary.ru/p/BQGN5','ЕЛЬ','Е'],['https://letary.ru/p/xN0KI','ЗИМА','З'],['https://letary.ru/p/Meta-','ДВЕРЬ','Д'],['https://letary.ru/p/AagNe','АРКА','А']
];
export const NOTE='Сундук не отпирается ключом. Ему нужно слово из шести букв. Портреты в башне любят загадки и умеют их задавать.';

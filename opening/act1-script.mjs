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
 line('mcgonagall-warning','mcgonagall','Я подозреваю Пивза. Он крутился возле Часовой башни перед тем, как остановились часы. В первую очередь проверим его.',{background:'corridor'}),
 line('mcgonagall-advice','mcgonagall','Только не рассчитывайте на прямой ответ. Сначала поймайте его — тогда, возможно, он перестанет отшучиваться.',{background:'corridor'}),
 shot('tower-entrance','travel',{background:'tower',durationMs:4500}),
 shot('hunt-rules','ready',{title:'Охота на Пивза',instruction:'На телефоне — твои ниши. Коснись Пивза, пока он не исчез. У каждого три арки. Лови Пивза, как только он появится. Общая цель — 8 поимок; за 10 команда получает 2 монеты. Пивз исчезает быстро: не жмите наугад — после промаха эта попытка потеряна.'}),
 line('peeves-start','peeves','Ах, гости! Игра в прятки! Мои любимые! Вы водите, а я прячусь, и никто меня не найдёт! Хи-хи!',{music:'joy'}),
 shot('hunt','hunt',{title:'Охота на Пивза',instruction:'Лови Пивза в своих нишах на телефоне.',music:'joy'}),
 line('peeves-six','peeves','Ну ладно, ладно. Это было случайно. Я почти поддался.',{music:'calm'}),
 line('peeves-ten','peeves','Нечестно! Я же предупреждал, что у меня полно ниш!',{music:'calm'}),
 line('peeves-result','peeves','Ладно. Вот записка. Больше не просите.',{music:'calm'}),
 shot('note','note',{title:'Записка Пивза',music:'calm'}),
 line('gallery-invitation','mcgonagall','Пивз исчез, а портреты вдруг притихли. Кажется, теперь они ждут вашего вопроса.',{background:'corridor'}),
 shot('gallery-journey','travel',{background:'corridor',durationMs:5000,music:'ambient-3'}),
 line('portrait-greeting','portrait','Ключ вам не поможет. Каждый из нас хранит загадку. Найдите свои портреты, выслушайте нас и соберите шесть букв по порядку. Тогда сундук откроется.',{background:'corridor',music:'ambient-3'}),
 shot('portraits','portraits',{title:'Ребус портретов',instruction:'Найдите свои портреты в комнате. На телефоне — личное задание и кнопка камеры. Вместе соберите слово из шести букв.',background:'corridor',music:'ambient-3'}),
 shot('chest','chest',{title:'Сундук открыт',instruction:'Внутри — ключ от механизма башни.',durationMs:4500,cue:'unlock',cueDuration:1.4}),
 line('dumbledore-key','dumbledore','Вот и ключ. Не тот, что отпирает двери. Тот, что заводит часы.',{expression:'smile'}),
 shot('mechanism-approach','travel',{background:'tower',durationMs:5500}),
 line('chime-explanation','dumbledore','Башня помнит свой звон. Смотрите, в каком порядке загораются знаки, а затем повторите его вместе. У каждого из вас — свои знаки. Договоритесь, кто вступает следующим.'),
 shot('chime-rules','ready',{title:'Эхо башни',instruction:'Запомните последовательность на общем экране. Затем повторите её вместе: каждый нажимает свои знаки на телефоне. Шесть ступеней — и колокол оживёт.'}),
 shot('chimes','chimes',{title:'Эхо башни',instruction:'Смотрите. Запоминайте. Повторяйте вместе.'}),
 line('chime-won','dumbledore','Вот теперь я слышу вас. Разные голоса — и один общий звон.',{expression:'smile',cue:'success',cueDuration:3}),
 shot('first-bell','bell',{title:'Удары полуночи: 3 из 12',durationMs:19500,music:null,cue:'midnight-three'}),
 line('end-bell','dumbledore','Колокол не дозвонил. Значит, часть полуночи действительно осталась здесь.',{music:null}),
 line('end-mystery','dumbledore','Кто-то не хотел, чтобы этот звон прозвучал. Это уже не похоже на случайность.',{music:null}),
 shot('act-result','ready',{title:'Удары полуночи: 3 из 12',instruction:'Одна часть полуночи осталась в башне.',music:null}),
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

export const PAINTING_CLUES=['Рыжебородый волшебник с книгой, за ним травы и фарфор.','Седой волшебник в круглых очках и бордовой мантии, за ним книжные полки.','Улыбающаяся седая волшебница в синей мантии с жемчужной брошью.','Темноволосая волшебница с седой прядью в фиолетовой мантии.','Улыбающийся волшебник с пышными белыми усами и палочкой.','Кудрявая темноволосая волшебница, подперевшая подбородок рукой.'];

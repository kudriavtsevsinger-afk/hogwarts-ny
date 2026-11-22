import { secondScene } from './scene02.mjs';
import { castleScenes } from './castle.mjs';
import { voices } from './voices.mjs';
// Stable IDs are also the future voice recording IDs.
export const introductions = [
  'Привет! Надеюсь, мы отлично проведём время!',
  'Кто-нибудь знает, где здесь самое интересное купе?',
  'Предлагаю держаться вместе. Так веселее',
  'Сначала доберёмся до школы. Потом познакомимся поближе'
];
export function sceneSequence(ids, cast, choices = {}, sweetChoices = {}, wishes = {}) {
  const cinematic = (id, visual, durationMs, extra = {}) => ({id, visual, durationMs, ...extra});
  const line = (id, speaker, text, actor, extra = {}) => ({id, visual:'dialogue', background:'platform', speaker, text, actor, voiceId:id, ...extra});

  return [
    cinematic('blackout','blackout',1400),
    cinematic('wall-pan','wall',6500,{outdoor:true}),
    cinematic('trolley-pass','trolley',5500,{outdoor:true}),
    cinematic('wall-cross','threshold',2200,{outdoor:true}),
    cinematic('platform-reveal','platform',4000),
    line('conductor-boarding','Проводник','Хогвартс-экспресс отправляется через пять минут! Прошу пассажиров занять свои места! И убедительно прошу не превращать багаж в животных. В прошлый раз мы три часа искали чей-то сундук по всему составу!','conductor'),
    cinematic('cat-reaction','platform',2200,{cue:'cat-meow',cueDuration:1.27}),
    line('conductor-filch','Проводник','Да, мистер Филч, это относится и к вам!','conductor'),
    cinematic('crowd-reaction','platform',3500,{cue:'crowd-laugh',cueDuration:3}),
    ...ids.map(id => cinematic('arrival-'+id,'arrival',3200,{actor:id,speaker:cast[id]})),
    cinematic('travelers-together','group',3200),
    line('caretaker-count','Смотритель','А вот и наши путешественники. Сколько вас тут? Старость, знаете ли. После сорока лет работы с волшебными поездами перестаёшь доверять даже собственным глазам.','caretaker'),
    {id:'ticket-check',visual:'choice',background:'platform',actor:'caretaker',speaker:'Смотритель',text:'Ваши билеты, пожалуйста.',interactive:true,interaction:'tickets'},
    line('caretaker-tickets','Смотритель','Имена совпадают. Билеты действительны. Прекрасно. Осталось выяснить одну маленькую вещь: вы уже знакомы друг с другом?','caretaker'),
    {id:'introductions',visual:'choice',background:'platform',actor:'caretaker',speaker:'Смотритель',text:'Вы уже знакомы друг с другом?',interactive:true,interaction:'introductions'},
    ...ids.map(id => line('introduction-'+id,cast[id],introductions[choices[id]] || '',id,{voiceId:`intro-${id}-${(choices[id] ?? 0)+1}`,expression:choices[id] === 3 ? 'neutral' : 'smile'})),
    line('caretaker-friendship','Смотритель','Вот и славно. Знаете, за столько лет я заметил одну удивительную вещь. На этой платформе люди часто встречаются впервые. А когда возвращаются обратно, уже не представляют, как раньше жили друг без друга.','caretaker'),
    cinematic('last-whistle','platform',5600,{cue:'train-whistle',cueDuration:5.39}),
    line('conductor-last-call','Проводник · за кадром','Последняя посадка!',null),
    line('caretaker-farewell','Смотритель','Ступайте. Хогвартс не любит ждать. Хотя, признаться, иногда и сам опаздывает.','caretaker'),
    cinematic('doors-open','door',4200),
    cinematic('boarding','boarding',5500),
    cinematic('departure','window',9000,{cue:'train-departure',cueDuration:12,carryCue:true}),
    cinematic('steam-transition','steam',3000),
    ...secondScene(ids,cast,sweetChoices),
    ...castleScenes(ids,cast,wishes)
  ].map(step => {
    const number=step.voiceNumber || ({'conductor-boarding':1,'conductor-filch':2,'caretaker-count':3,'caretaker-tickets':4,'caretaker-friendship':5,'conductor-last-call':6,'caretaker-farewell':7})[step.id];
    if(number)return {...step,voiceNumber:number,voice:voices[number],durationMs:undefined};
    if(step.text && !step.interactive && !step.durationMs)return {...step,durationMs:Math.max(3800,step.text.length*65)};
    return step;
  });
}
export function storyPosition(room, cast, now = Date.now()) {
  const steps = sceneSequence(room.lineup, cast, room.introductions, room.sweets, room.wishes);
  let index = room.storyIndex ?? 0, startedAt = room.storyStartedAt;
  const time = room.pausedAt ?? now;
  while (steps[index]?.durationMs && time >= startedAt + steps[index].durationMs && index < steps.length-1) {
    startedAt += steps[index].durationMs; index++;
  }
  return { step:steps[index], index, startedAt, elapsedMs:Math.max(0,time-startedAt), count:steps.length };
}

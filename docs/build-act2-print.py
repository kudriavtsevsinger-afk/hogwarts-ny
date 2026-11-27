from pathlib import Path
import json,math,itertools,subprocess
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4,A3,landscape
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]; ART=ROOT/'avatar-static/opening/art/act2'
OUT=ROOT/'output/pdf';OUT.mkdir(parents=True,exist_ok=True)
for name,file in [('Body','NotoSerif-Regular.ttf'),('Italic','NotoSerif-Italic.ttf'),('Bold','NotoSerif-Bold.ttf'),('Sans','NotoSans-Regular.ttf')]:pdfmetrics.registerFont(TTFont(name,'/usr/share/fonts/truetype/noto/'+file))
pdfmetrics.registerFont(TTFont('Title',str(ROOT/'avatar-static/opening/fonts/headings.ttf')))
pdfmetrics.registerFont(TTFont('Symbols','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
mm=72/25.4; W,H=A4;page=0
ink=HexColor('#18352e');gold=HexColor('#a17a3b');paper=HexColor('#f4eddb');muted=HexColor('#6e7561')
c=canvas.Canvas(str(OUT/'act2-print-kit.pdf'),pagesize=A4);c.setTitle('Хогвартс · Акт II · Печатный комплект');c.setAuthor('Хогвартс · Тайна последней полуночи')
rules=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {INGREDIENTS,SHEETS} from './opening/act2-rules.mjs';console.log(JSON.stringify({ingredients:INGREDIENTS,sheets:SHEETS}))"],cwd=ROOT,text=True));names=rules['ingredients'];ids=['wormwood','bubotuber','mandrake','asphodel','gillyweed','valerian'];nums=[7,1,5,2,9,4]
notes=['Мандрагора стоит левее Жаброслей.','Бубонтюбер стоит прямо слева от Мандрагоры.','Валериана стоит на правом краю.','Полынь стоит левее всех остальных.','Асфодель стоит рядом с Жаброслями.','Между Мандрагорой и Валерианой ровно два горшка.','Жабросли не стоят рядом с Мандрагорой.','Жабросли стоят первыми. Я проверил. Честно-честно.']
def text(s,x,y,size=12,font='Body',color=ink):
 c.setFillColor(color);c.setFont(font,size);c.drawString(x,y,s)
def centered(s,y,size=22,font='Title',color=ink):
 c.setFillColor(color);c.setFont(font,size);c.drawCentredString(W/2,y,s)
def para(s,x,y,width,size=14,font='Body',color=ink):
 s=s.replace('→','<font name="Symbols">→</font>')
 p=Paragraph(s,ParagraphStyle('p',fontName=font,fontSize=size,leading=size*1.55,textColor=color));pw,ph=p.wrap(width,H);p.drawOn(c,x,y-ph);return y-ph

def flourish(x,y,scale=1):
 c.saveState();c.translate(x,y);c.scale(scale,scale);c.setStrokeColor(gold);c.setLineWidth(.7)
 c.line(-50,0,50,0)
 for a in [-1,1]:
  for n in range(1,5):
   c.ellipse(a*n*9-5,2,a*n*9+5,8,stroke=1,fill=0)
 c.restoreState()
def new(label='',size=A4):
 global page,W,H
 if page:c.showPage()
 page+=1;W,H=size;c.setPageSize(size);c.setFillColor(paper);c.rect(0,0,W,H,fill=1,stroke=0)
 c.setStrokeColor(gold);c.setLineWidth(.7);c.rect(12*mm,12*mm,W-24*mm,H-24*mm)
 c.setLineWidth(.25);c.rect(14*mm,14*mm,W-28*mm,H-28*mm)
 text('ХОГВАРТС  /  ЗИМНЯЯ ТЕПЛИЦА',20*mm,H-24*mm,9,'Sans',muted)
 if label:text(label,20*mm,20*mm,9,'Sans',muted)
 c.setFont('Sans',9);c.drawRightString(W-20*mm,20*mm,str(page))
def picture(name,x,y,w,h):
 im=Image.open(ART/(name+'.webp'));c.drawImage(ImageReader(im),x,y,w,h,preserveAspectRatio=True,anchor='c',mask='auto')
def title(s,sub=''):
 centered(s,H-44*mm,30);flourish(W/2,H-52*mm)
 if sub:centered(sub,H-64*mm,11,'Sans',muted)
new('Памятка подготовки · не выкладывать на игровой стол');title('Зимняя теплица','ПЕЧАТНЫЙ КОМПЛЕКТ · АКТ II')
picture('plant-asphodel',W/2-42*mm,110*mm,84*mm,105*mm)
y=100*mm
for s in ['Каталог растений: страница 2. Карточки: страница 3.','Записки: страницы 4–5. Полка A3: страница 6.','Книга эликсира: страницы 7–15. Решение для подготовки: 16.']:
 y=para(s,24*mm,y,W-48*mm,12)-5*mm
para('Печать односторонняя, в масштабе 100%. Страница 6 — A3, альбомная; остальные — A4. Если принтер только A4, распечатай полку в режиме «Постер» на двух листах. Карточки и записки разрежь по рамкам. Для карточек подойдёт матовая бумага 180–250 г/м².',24*mm,y,W-48*mm,11)
new('Каталог · порядок ниже не задаёт порядок на полке');title('Каталог растений','ЛИЧНАЯ КОЛЛЕКЦИЯ ПРОФЕССОРА СПРАУТ')
order=[3,1,5,4,2,0]
for j,i in enumerate(order):
 col=j%2;row=j//2;x=23*mm+col*86*mm;y=H-140*mm-row*65*mm
 picture('plant-'+ids[i],x+15*mm,y+10*mm,50*mm,52*mm)
 text(names[i],x,y+5*mm,15,'Bold');text('Каталог № '+str(nums[i]),x,y-2*mm,10,'Sans',muted)
new('Карточки растений · вырезать шесть карточек');title('Гербарий','КАРТОЧКИ ДЛЯ ПОЛКИ')
for j,i in enumerate([4,0,5,2,3,1]):
 x=18*mm+(j%3)*59*mm;y=H-158*mm-(j//3)*98*mm
 c.setStrokeColor(gold);c.roundRect(x,y,55*mm,90*mm,3*mm,stroke=1,fill=0)
 picture('plant-'+ids[i],x+3*mm,y+18*mm,49*mm,66*mm)
 text(names[i],x+4*mm,y+10*mm,10,'Bold');text('№ '+str(nums[i]),x+4*mm,y+4*mm,8,'Sans',muted)
def hat(x,y):
 c.saveState();c.translate(x,y);c.setStrokeColor(ink);c.setLineWidth(1)
 p=c.beginPath();p.moveTo(-13,-3);p.curveTo(-15,10,-12,19,-4,26);p.curveTo(-4,14,3,7,9,3);p.curveTo(12,11,19,13,24,11);p.curveTo(14,7,17,-3,14,-5);p.close();c.drawPath(p)
 c.ellipse(-15,-8,15,-2);c.circle(-4,28,2);c.circle(24,11,2);c.restoreState()
for batch in range(2):
 new('Записки · вырезать и перемешать обе страницы');title('Записки садовницы','НАЙДЕНЫ МЕЖДУ СТРАНИЦАМИ КАТАЛОГА')
 for j,i in enumerate([5,0,7,2] if batch==0 else [4,1,6,3]):
  x=22*mm+(j%2)*87*mm;y=H-159*mm-(j//2)*100*mm
  c.setStrokeColor(gold);c.rect(x,y,79*mm,89*mm,stroke=1,fill=0)
  flourish(x+39.5*mm,y+77*mm,.48)
  para(notes[i],x+8*mm,y+64*mm,63*mm,14,'Italic')
  if i==7:hat(x+39*mm,y+14*mm)
  else:text('П. Спраут',x+8*mm,y+12*mm,10,'Italic',muted)
new('Полка · A3 · расположите карточки слева направо',landscape(A3));title('Полка теплицы №3','ШЕСТЬ ГОРШКОВ · ОДИН ПОРЯДОК')
for i in range(6):
 x=20*mm+i*63*mm;y=72*mm
 c.setStrokeColor(gold);c.roundRect(x,y,59*mm,98*mm,4*mm,stroke=1,fill=0)
 c.circle(x+29.5*mm,y+48*mm,24*mm,stroke=1,fill=0);text(str(i+1),x+27*mm,y-10*mm,16,'Sans',muted)
centered('Слева направо',45*mm,12,'Sans',muted);new('Книга эликсира · обложка');title('Книга эликсира','ЗАПИСИ ПРОФЕССОРА СПРАУТ')
picture('potion-green',W/2-65*mm,93*mm,130*mm,127*mm)
centered('Тепло начинается с взаимопонимания.',67*mm,15,'Italic')
para('Шесть листов. Пять раундов. Один котёл.<br/>Смотри на общий экран. Читай свой лист вслух.<br/>Слушай остальных, прежде чем добавить ингредиент.',28*mm,52*mm,W-56*mm,12)
new('Книга эликсира · правила чтения');title('Как читать котёл')
y=H-75*mm
for h,body in [('Сначала наблюдай','Цвет, пар и пузыри задают три ингредиента. Базовый порядок всегда такой: ЦВЕТ → ПАР → ПУЗЫРИ.'),('Потом проверь свечение','Если котёл светится, пропусти второй ингредиент базовой последовательности: тот, который задаёт пар.'),('Затем проверь иней','Если на кромке иней, разверни оставшуюся последовательность. При сочетании двух признаков сначала пропускай второй ингредиент, затем разворачивай порядок.'),('Теперь действуйте вместе','Одинаковые ингредиенты не объединяйте: если один встретился дважды, добавить его нужно два раза. Нужную кнопку нажимает тот, у кого она есть на телефоне.')]:
 text(h,25*mm,y,17,'Bold');y=para(body,25*mm,y-8*mm,W-50*mm,13)-14*mm
for idx,(heading,body) in enumerate(rules['sheets']):
 new('Книга эликсира · лист '+str(idx+1));title(heading,'ЛИСТ '+str(idx+1)+' ИЗ 6')
 if idx in [0,1]:
  cols=[('blue','Синий','Валериана'),('green','Зелёный','Полынь')] if idx==0 else [('red','Красный','Асфодель'),('yellow','Жёлтый','Жабросли')]
  for j,(color,label,ingredient) in enumerate(cols):
   yy=H-155*mm-j*94*mm;picture('potion-'+color,24*mm,yy,74*mm,78*mm);text(label,110*mm,yy+49*mm,20,'Bold');text(ingredient,110*mm,yy+34*mm,17);text('добавь по цвету',110*mm,yy+23*mm,10,'Sans',muted)
 elif idx in [2,3]:
  lines=[('Пара нет','Мандрагора'),('Лёгкий пар','Бубонтюбер'),('Густой пар','Валериана')] if idx==2 else [('Редкие пузыри','Жабросли'),('Частые пузыри','Мандрагора'),('Котёл кипит','Асфодель')]
  for j,(state,name) in enumerate(lines):
   yy=H-118*mm-j*57*mm;i=names.index(name);picture('plant-'+ids[i],25*mm,yy-18*mm,36*mm,48*mm);text(state,73*mm,yy+12*mm,18,'Bold');text(name,73*mm,yy-2*mm,17);c.setStrokeColor(gold);c.line(73*mm,yy-12*mm,W-25*mm,yy-12*mm)
 else:
  picture('potion-blue' if idx==4 else 'potion-yellow',W/2-58*mm,125*mm,116*mm,108*mm)
  y=para(body,28*mm,111*mm,W-56*mm,23,'Bold')-10*mm
  extra='Сначала учти свечение, если оно есть. Потом меняй направление. Последний оставшийся ингредиент становится первым.' if idx==4 else 'Речь о втором ингредиенте в базовом порядке «цвет, пар, пузыри». Убери ингредиент пара. Если есть иней, только теперь разверни порядок.'
  para(extra,28*mm,y,W-56*mm,14)
new('Книга эликсира · совместная работа');title('Памятка команды')
y=H-77*mm
for h,body in [('Пять раундов','1–2: цвет, пар и пузыри. 3: добавляется иней. 4: появляется свечение. 5: иней и свечение одновременно.'),('Котёл остывает','На раунды даётся 90, 75, 75, 75 и 90 секунд. Три трещины или истёкший таймер запускают новую попытку с другим состоянием.'),('Если нужна помощь','Подсказка за 1 монету называет следующий ингредиент. Очки Спраут показывают нужные листы; Щит Хранителя убирает одну трещину; часы «Тик-так» добавляют 30 секунд.'),('Пример из книги','Синий, лёгкий пар, редкие пузыри: Валериана → Бубонтюбер → Жабросли. Со свечением: Валериана → Жабросли. Со свечением и инеем: Жабросли → Валериана.')]:
 text(h,25*mm,y,17,'Bold');y=para(body,25*mm,y-8*mm,W-50*mm,13)-13*mm
new('Только для подготовки · не выдавать игрокам');title('Проверка реквизита')
y=H-75*mm
for h,body in [('До игры','Положи каталог, шесть карточек, полку и восемь перемешанных записок на общий стол. Восьмая записка с колпаком — подмена Пивза. На самих записках ответ и метка «фальшивая» не напечатаны.'),('Книга и телефоны','Шесть листов книги раздаются по кругу в порядке участников: 1, 2, 3… Если участников трое: 1/4, 2/5, 3/6. При четырёх: 1/5, 2/6, 3, 4. При пяти: 1/6, 2, 3, 4, 5. При шести: по одному. Это совпадает с распределением на телефонах. Общую памятку можно оставить на столе.'),('Правильная полка','Полынь → Бубонтюбер → Мандрагора → Асфодель → Жабросли → Валериана. Код шкафчика: 715294.'),('Печать','A4: страницы 1–5 и 7–16. A3 альбомная: страница 6. Печатай без двустороннего режима и без подгонки масштаба. Не разрезай книгу, если предпочитаешь использовать только листы на телефонах.')]:
 text(h,25*mm,y,17,'Bold');y=para(body,25*mm,y-8*mm,W-50*mm,12)-13*mm
c.save();print('PDF pages',page)
import fitz
d=fitz.open(OUT/'act2-print-kit.pdf');thumbdir=ROOT/'output/pdf-review';thumbdir.mkdir(exist_ok=True)
for i,p in enumerate(d):p.get_pixmap(matrix=fitz.Matrix(.7,.7)).save(str(thumbdir/f'page-{i+1}.png'))
# Contact sheet for internal layout check.
ims=[Image.open(thumbdir/f'page-{i+1}.png').convert('RGB') for i in range(len(d))]
contact=Image.new('RGB',(1000,math.ceil(len(ims)/4)*380),'#bbb')
for i,im in enumerate(ims):im.thumbnail((240,340));contact.paste(im,((i%4)*250,(i//4)*380))
contact.save(thumbdir/'contact.jpg')

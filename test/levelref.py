# 악기 기본 음량 측정용 시험 악보(MusicXML): 악기마다 편한 음역의 음계(4분음표) + 긴 음, 타악은 소리마다 4분음표. 셈여림 표시 없음(보통)
# python3 test/levelref.py <출력.musicxml>
import sys
MEL = [  # (이름, 악기, 시작 음 midi) — 음계는 시작 음부터 한 옥타브
 ('가야금','gayageum',55),('거문고','geomungo',45),('양금','yanggeum',60),('대금','daegeum',65),('소금','sogeum',72),
 ('피리','piri',60),('대피리','daepiri',50),('태평소','taepyeongso',72),('생황','saenghwang',72),('해금','haegeum',62),
 ('아쟁','ajaeng',45),('피아노','piano',60)]
PERC = ['따','궁','꽹과리','꽹과리막음','징','북','북녹음','북짧게','바라','심벌','하이햇','베이스드럼','스네어','봉고','봉고높게','탬버린','트라이앵글','카바사','윈드차임','팀파니','팀파니높게']
STEPS=['C','C','D','D','E','F','F','G','G','A','A','B']; ALT=[0,1,0,1,0,0,1,0,1,0,1,0]
def pitch(m): return f'<pitch><step>{STEPS[m%12]}</step>{"<alter>1</alter>" if ALT[m%12] else ""}<octave>{m//12-1}</octave></pitch>'
SCALE=[0,2,4,5,7,9,11,12]
out=['<?xml version="1.0" encoding="UTF-8"?>','<score-partwise version="3.1"><work><work-title>음량 시험</work-title></work><part-list>']
parts=[(n,'m',i,s) for n,i,s in MEL]+[('타악 '+p,'p',p,0) for p in PERC]
for k,(n,*_) in enumerate(parts): out.append(f'<score-part id="P{k+1}"><part-name>{n}</part-name></score-part>')
out.append('</part-list>')
for k,(n,kind,inst,s) in enumerate(parts):
    out.append(f'<part id="P{k+1}">')
    if kind=='m':
        seq=[s+x for x in SCALE]+[s+x for x in SCALE[::-1]]
        bars=[seq[i:i+4] for i in range(0,16,4)]
        for b,notes in enumerate(bars):
            out.append(f'<measure number="{b+1}">')
            if b==0: out.append('<attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>90</per-minute></metronome></direction-type><sound tempo="90"/></direction>')
            for m in notes: out.append(f'<note>{pitch(m)}<duration>4</duration><voice>1</voice><type>quarter</type></note>')
            out.append('</measure>')
        for b,m in enumerate([s+4,s+7]):
            out.append(f'<measure number="{b+5}"><note>{pitch(m)}<duration>16</duration><voice>1</voice><type>whole</type></note></measure>')
    else:
        for b in range(6):
            out.append(f'<measure number="{b+1}">')
            if b==0: out.append('<attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>percussion</sign></clef><staff-details><staff-lines>1</staff-lines></staff-details></attributes><direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>90</per-minute></metronome></direction-type><sound tempo="90"/></direction>')
            for _ in range(4): out.append('<note><unpitched><display-step>E</display-step><display-octave>4</display-octave></unpitched><duration>4</duration><voice>1</voice><type>quarter</type><stem>up</stem></note>')
            out.append('</measure>')
    out.append('</part>')
out.append('</score-partwise>')
open(sys.argv[1],'w').write('\n'.join(out))
import json; json.dump([dict(name=n,kind=kind,inst=inst) for n,kind,inst,s in parts],open(sys.argv[1]+'.json','w'),ensure_ascii=False)

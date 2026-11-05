#!/bin/bash
# 내보낸 MusicXML을 뮤즈스코어로 열어 PDF로: 쪽 수를 원래 쪽 바꿈(+1)과 비교
export QT_QPA_PLATFORM=offscreen
cd /home/claude/mscore
for f in "$@"; do
  id=$(basename $f .musicxml)
  exp=$(python3 -c "
import re,sys;s=open('$f',encoding='utf-8').read();m=re.search(r'<part id=\"P1\">(.*?)</part>',s,re.S);print(m.group(1).count('new-page=\"yes\"')+1 if m else 0)")
  timeout 300 squashfs-root/AppRun -o all/$id.pdf $f >/dev/null 2>&1; rc=$?
  pages=$(pdfinfo all/$id.pdf 2>/dev/null | grep Pages | tr -s ' ' | cut -d' ' -f2)
  echo "$id rc=$rc pages=${pages:-NONE} expected=$exp"
done

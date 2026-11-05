# pair.sh <파트> <줄> <마디> <총보> <줄> <마디> → /tmp/pair.png
cd /home/claude/scoreplay
node test/crop.mjs $1 $2 $3 >/dev/null 2>&1; node test/crop.mjs $4 $5 $6 >/dev/null 2>&1
python3 -c "
from PIL import Image
a=Image.open('/tmp/crop-$1-$2-$3.png'); b=Image.open('/tmp/crop-$4-$5-$6.png')
w=max(a.width,b.width); im=Image.new('RGB',(w,a.height+b.height+10),'white'); im.paste(a,(0,0)); im.paste(b,(0,a.height+10)); im.save('/tmp/pair.png')"

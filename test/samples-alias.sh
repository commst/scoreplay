#!/bin/bash
# 시험 도구(pw*.cjs·fuzz2.cjs)가 쓰는 옛 샘플 접두어를 지금 샘플(비공개 저장소 scoreplay_sample)의 같은 곡 파일에 이어 준다.
# 새 작업 공간에서 샘플을 받은 뒤 한 번: bash test/samples-alias.sh   (회귀 목록에는 넣지 않도록 이름 끝이 -ALIAS.pdf)
S=${SAMPLES:-/home/claude/samples}
link() { local src=$(ls "$S" | grep "^$2" | grep -v ALIAS | head -1); [ -n "$src" ] && ln -sf "$S/$src" "$S/$1-$3-ALIAS.pdf" && echo "$1 -> $src"; }
link b3a31a97 52271c34 yanbian-score      # 연변목가 총보(15줄)
link 44e95fb3 3193c459 flowersofk-score  # Flower of K 총보

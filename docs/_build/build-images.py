# -*- coding: utf-8 -*-
"""把产品截图压成 GitHub README 用的体积，落到仓库 docs/images/。

原则：等比缩放不裁切、不改变画面内容；只压尺寸与编码。
"""
import os
from PIL import Image

SRC_A = r"E:\codes\创业\10.18黑客松\deliverables\assets"
SRC_P = r"E:\codes\创业\10.18黑客松\deliverables\_build\preview-full"
DST = r"E:\codes\python\tuijian-web\docs\images"
os.makedirs(DST, exist_ok=True)

# (源文件, 输出名, 目标宽度, 编码)
JOBS = [
    (rf"{SRC_P}\page-0001.png",               "hero.png",             1600, "png"),
    (rf"{SRC_A}\product.png",                 "ui-product.png",       1200, "png"),
    (rf"{SRC_A}\audience.png",                "ui-audience.png",      1200, "png"),
    (rf"{SRC_A}\AI_ask.png",                  "ui-ask.png",           1099, "png"),
    (rf"{SRC_A}\review.png",                  "ui-review.png",        1200, "png"),
    (rf"{SRC_A}\editor.png",                  "ui-editor.png",        1200, "png"),
    (rf"{SRC_A}\art-xhs.png",                 "art-xhs.png",          1400, "jpg"),
    (rf"{SRC_A}\art-weibo-mob.png",           "art-weibo.png",         760, "jpg"),
    (rf"{SRC_A}\art-gzh.png",                 "art-gzh.png",           760, "jpg"),
    (rf"{SRC_A}\art-gzh-preview.png",         "art-preview.png",      1200, "png"),
]

for src, name, w, enc in JOBS:
    if not os.path.exists(src):
        print("MISSING", src)
        continue
    im = Image.open(src).convert("RGB")
    if im.size[0] != w:
        h = round(im.size[1] * w / im.size[0])
        im = im.resize((w, h), Image.LANCZOS)
    out = os.path.join(DST, name)
    if enc == "jpg":
        im.save(out, "JPEG", quality=88, optimize=True, progressive=True)
    else:
        im.save(out, "PNG", optimize=True)
    print(f"{name:20s} {im.size[0]}x{im.size[1]:<5d} {os.path.getsize(out)/1024:7.1f} KB")

total = sum(os.path.getsize(os.path.join(DST, f)) for f in os.listdir(DST))
print(f"\n合计 {total/1048576:.2f} MB  ({len(os.listdir(DST))} 个文件)")

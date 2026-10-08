#!/usr/bin/env python3
"""Artes das lojas na identidade Queizy.

Uso: python3 compose.py <pasta com as telas cruas> <pasta de saída>
As telas cruas são capturas do simulador (1320x2868) com os nomes de SLIDES.
Gera: ios/NN.png (1320x2868), play/NN.png (1080x2160) e play/feature.png (1024x500).
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, '..', '..', 'assets', 'fonts')
LOGO = os.path.join(HERE, '..', '..', 'assets', 'logo-lockup@3x.png')
ICON = os.path.join(HERE, '..', '..', 'assets', 'icon.png')
BUST = os.path.join(HERE, '..', '..', 'assets', 'charlotte-bust.png')

INK = (22, 19, 31)
VOLT = (220, 255, 74)
PAPER = (250, 247, 240)
PINK = (255, 79, 139)
VIOLET = (107, 75, 255)
WHITE = (255, 255, 255)

# (arquivo da tela, fundo, cor do texto, título, subtítulo)
SLIDES = [
    ('home.png', VOLT, INK, 'Fale inglês sem\nmedo de errar', 'A Charlotte é a sua tutora de IA'),
    ('livevoice.png', INK, WHITE, 'Converse por voz,\nem tempo real', 'Live Voice com a Charlotte'),
    ('trail.png', PAPER, INK, 'Uma trilha do\nseu nível', 'Do iniciante ao avançado, A1 a C2'),
    ('pronunciation.png', PINK, WHITE, 'Pronúncia com\nnota de verdade', 'Veja as palavras que precisam de atenção'),
    ('evolution.png', VIOLET, WHITE, 'Acompanhe a sua\nevolução', 'Resumo da semana feito pela Charlotte'),
    ('together.png', VOLT, INK, 'Estude junto com\nos seus amigos', 'Convide e ganhem minutos de conversa'),
]


def font(size, weight='ExtraBold'):
    return ImageFont.truetype(os.path.join(FONTS, f'BricolageGrotesque96pt-{weight}.ttf'), size)


def rounded(img, radius):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out


def phone(screen, width):
    """Tela com moldura escura e cantos arredondados, como um aparelho."""
    h = int(screen.size[1] * width / screen.size[0])
    s = screen.convert('RGB').resize((width, h), Image.LANCZOS)
    bezel = max(14, width // 45)
    frame = Image.new('RGBA', (width + bezel * 2, h + bezel * 2), (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle([0, 0, frame.size[0] - 1, frame.size[1] - 1], radius=int(width * 0.13), fill=INK + (255,))
    frame.alpha_composite(rounded(s.convert('RGBA'), int(width * 0.115)), (bezel, bezel))
    return frame


def shadow(size, radius, offset=30, blur=40, alpha=90):
    sh = Image.new('RGBA', (size[0] + blur * 4, size[1] + blur * 4), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([blur * 2, blur * 2 + offset, blur * 2 + size[0], blur * 2 + size[1] + offset], radius=radius, fill=(0, 0, 0, alpha))
    return sh.filter(ImageFilter.GaussianBlur(blur)), blur * 2


def slide(screen_path, bg, fg, title, sub, W, H):
    canvas = Image.new('RGBA', (W, H), bg + (255,))
    d = ImageDraw.Draw(canvas)
    pad = int(W * 0.08)
    tsize = int(W * 0.088)
    y = int(H * 0.055)
    d.multiline_text((pad, y), title, font=font(tsize), fill=fg, spacing=int(tsize * 0.08))
    tb = d.multiline_textbbox((pad, y), title, font=font(tsize), spacing=int(tsize * 0.08))
    ssize = int(W * 0.036)
    d.text((pad, tb[3] + int(ssize * 0.9)), sub, font=font(ssize, 'Bold'), fill=fg + (200,) if len(fg) == 3 else fg)
    top = tb[3] + int(ssize * 3.2)

    screen = Image.open(screen_path)
    pw = int(W * 0.80)
    ph_img = phone(screen, pw)
    # A tela sai pela borda de baixo, como nas lojas de referência.
    x = (W - ph_img.size[0]) // 2
    sh, off = shadow(ph_img.size, int(pw * 0.13))
    canvas.alpha_composite(sh, (x - off, top - off))
    canvas.alpha_composite(ph_img, (x, top))
    return canvas.convert('RGB')


def feature(out_path):
    W, H = 1024, 500
    c = Image.new('RGB', (W, H), VOLT)
    d = ImageDraw.Draw(c)
    logo = Image.open(LOGO).convert('RGBA')
    lw = 420
    logo = logo.resize((lw, int(logo.size[1] * lw / logo.size[0])), Image.LANCZOS)
    c.paste(logo, (70, 120), logo)
    d.text((72, 120 + logo.size[1] + 40), 'Inglês com a Charlotte,\nsua tutora de IA', font=font(46, 'Bold'), fill=INK, spacing=8)
    # Charlotte num círculo Tinta, saindo pela borda de baixo.
    r = 380
    circle = Image.new('RGBA', (r, r), (0, 0, 0, 0))
    ImageDraw.Draw(circle).ellipse([0, 0, r - 1, r - 1], fill=INK + (255,))
    bust = Image.open(BUST).convert('RGBA')
    bw = int(r * 0.92)
    bust = bust.resize((bw, int(bust.size[1] * bw / bust.size[0])), Image.LANCZOS)
    mask = Image.new('L', (r, r), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, r - 1, r - 1], fill=255)
    layer = Image.new('RGBA', (r, r), (0, 0, 0, 0))
    layer.alpha_composite(bust, ((r - bw) // 2, r - bust.size[1]) if bust.size[1] <= r else ((r - bw) // 2, 0))
    layer.putalpha(Image.composite(layer.getchannel('A'), Image.new('L', (r, r), 0), mask))
    circle.alpha_composite(layer)
    c.paste(circle, (W - r - 70, (H - r) // 2), circle)
    c.save(out_path)


def main():
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'ios'), exist_ok=True)
    os.makedirs(os.path.join(out, 'play'), exist_ok=True)
    for i, (name, bg, fg, title, sub) in enumerate(SLIDES, 1):
        p = os.path.join(src, name)
        if not os.path.exists(p):
            print('falta', name)
            continue
        slide(p, bg, fg, title, sub, 1320, 2868).save(os.path.join(out, 'ios', f'{i:02d}.png'))
        os.makedirs(os.path.join(out, 'ios-6.3'), exist_ok=True)
        slide(p, bg, fg, title, sub, 1206, 2622).save(os.path.join(out, 'ios-6.3', f'{i:02d}.png'))
        slide(p, bg, fg, title, sub, 1080, 2160).save(os.path.join(out, 'play', f'{i:02d}.png'))
        print('ok', name)
    feature(os.path.join(out, 'play', 'feature.png'))
    print('ok feature')


if __name__ == '__main__':
    main()

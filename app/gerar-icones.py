"""Ícones provisórios do FrotaFácil (quadrado verde com "FF"), até existir a logo definitiva.
Uso: python gerar-icones.py   (rodar dentro da pasta app; sobrescreve assets/ e public/)"""
from PIL import Image, ImageDraw, ImageFont

VERDE = (22, 163, 74, 255)
BRANCO = (255, 255, 255, 255)
FONTE = "C:/Windows/Fonts/arialbd.ttf"


def texto(img, cor, escala=0.52):
    w = img.size[0]
    f = ImageFont.truetype(FONTE, int(w * escala))
    d = ImageDraw.Draw(img)
    caixa = d.textbbox((0, 0), "FF", font=f)
    x = (w - (caixa[2] - caixa[0])) / 2 - caixa[0]
    y = (w - (caixa[3] - caixa[1])) / 2 - caixa[1]
    d.text((x, y), "FF", font=f, fill=cor)
    return img


def quadrado(tam, raio):
    img = Image.new("RGBA", (tam, tam), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle((0, 0, tam - 1, tam - 1), radius=int(tam * raio), fill=VERDE)
    return texto(img, BRANCO)


for caminho, tam, raio in [("assets/icon.png", 1024, 0.0), ("assets/favicon.png", 196, 0.18),
                           ("public/icon-192.png", 192, 0.0), ("public/icon-512.png", 512, 0.0),
                           ("public/apple-touch-icon.png", 180, 0.0)]:
    img = quadrado(tam, raio)
    if raio == 0.0:  # ícones "cheios" (sem canto arredondado) para o sistema aplicar a máscara
        img = Image.new("RGBA", (tam, tam), VERDE); texto(img, BRANCO)
    img.save(caminho)

# Android adaptativo: primeiro plano transparente com o texto menor (zona segura), fundo verde liso, monocromático.
fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0)); texto(fg, BRANCO, 0.34); fg.save("assets/android-icon-foreground.png")
Image.new("RGBA", (1024, 1024), VERDE).save("assets/android-icon-background.png")
mono = Image.new("RGBA", (432, 432), (0, 0, 0, 0)); texto(mono, (0, 0, 0, 255), 0.34); mono.save("assets/android-icon-monochrome.png")
sp = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0)); texto(sp, BRANCO, 0.46); sp.save("assets/splash-icon.png")
print("ícones gerados")

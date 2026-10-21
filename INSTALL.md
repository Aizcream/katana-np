# Instalar Katana NP (paso a paso)

Katana NP hace videos de motion graphics súper dinámicos (estilo Higgsfield Katana) con Claude, en tu propio Mac: le
pasas una referencia y tus recursos, y te devuelve la edición con tu producto. **Solo funciona en Mac** (no en Windows
ni en Linux).

Esta guía te deja todo funcionando en unos **30–45 minutos** la primera vez (casi todo es esperar descargas; si ya
tienes Homebrew y Chrome, unos 5–10 minutos). No necesitas saber programar: copia y pega cada comando tal cual.

---

## 0. Antes de empezar

| Necesitas | Cómo comprobarlo |
|---|---|
| **Un Mac con chip Apple** (M1, M2, M3, M4 o más nuevo) y macOS 14 (Sonoma) o más nuevo. En Macs con procesador Intel la instalación puede tardar más de una hora o fallar (Homebrew ya no los soporta bien): si tu Mac es Intel, avísale a quien te compartió Katana NP antes de empezar. | Menú Apple (la manzana, arriba a la izquierda) → *Acerca de esta Mac*: debe decir *Chip Apple M…* |
| Tu usuario del Mac debe ser **Administrador**. | *Configuración del Sistema* → *Usuarios y grupos*: bajo tu nombre dice *Administrador*. |
| **Claude Code** con tu sesión iniciada. Necesitas un plan de pago de Claude (Pro, Max, Team o Enterprise; el gratuito no sirve). Lo más fácil es la app de escritorio **Claude**: descárgala en <https://claude.com/download>, arrástrala a *Aplicaciones*, ábrela e inicia sesión. | Abre la app Claude: arriba debe aparecer la pestaña **Code**. Si te pide mejorar el plan, tu plan no incluye Claude Code. |
| **Una cuenta de GitHub** con acceso al repositorio privado de Katana NP. | Te llega un correo de GitHub: *«… has invited you to collaborate on Aizcream/katana-np»*. Pulsa **View invitation** y luego **Accept invitation**. La invitación caduca a los 7 días (también la ves en <https://github.com/Aizcream/katana-np/invitations>). |
| **10 GB libres** en el disco (la instalación ocupa ~6 GB en un Mac nuevo; el resto es para tus videos). | Menú Apple → *Configuración del Sistema* → *General* → *Almacenamiento* |

¿No tienes cuenta de GitHub? Créala gratis en <https://github.com/signup> (te enviará un código al correo para
verificarla) y envíale tu **nombre de usuario** a quien te comparte Katana NP para que te invite.

---

## 1. Abre la Terminal

Pulsa **⌘ + Espacio**, escribe **Terminal** y presiona **Enter**. Se abre una ventana con texto.

- **Para pegar un comando:** cópialo de esta guía (en github.com cada bloque gris tiene un botón de copiar), pégalo con
  **⌘ + V** en la Terminal y presiona **Enter**.
- **Sabes que terminó** cuando vuelve a aparecer la línea que acaba en **%**. Espera a eso antes de pegar el siguiente.
- **Si parece detenido**, lee la última línea: quizá pide tu contraseña del Mac (al escribirla **no se ve nada**; es
  normal) o que presiones **Enter**.
- **Para cancelar algo:** **Control + C**.

---

## 2. Comprueba Homebrew (e instálalo si falta)

Homebrew instala los programas que usa Katana NP. Pega este comando (sirve para cualquier Mac, también si otra persona
de este Mac ya instaló Homebrew, y se puede repetir sin problema):

```bash
for B in /opt/homebrew/bin/brew /usr/local/bin/brew; do [ -x "$B" ] && break; B=""; done; if [ -n "$B" ]; then grep -qsF "$B shellenv" ~/.zprofile || echo "eval \"\$($B shellenv)\"" >> ~/.zprofile; eval "$($B shellenv)"; brew --version; else echo "No encuentro Homebrew: instálalo con el comando de abajo."; fi
```

- Si responde `Homebrew` y un número (por ejemplo `Homebrew 7.0.10`) → **ya lo tienes: salta al paso 3.**
- Si dice *No encuentro Homebrew* → instálalo:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Te pedirá la **contraseña de tu Mac** (no se ve al escribirla: escríbela y presiona **Enter**). Cuando diga *Press
RETURN/ENTER to continue*, presiona **Enter**. Tarda 5–15 minutos. Al terminar, **vuelve a pegar el primer comando de
este paso**: debe responder `Homebrew` y un número.

---

## 3. Conecta la Terminal con tu cuenta de GitHub

```bash
brew install gh
```

```bash
gh auth login --hostname github.com --git-protocol https --web --clipboard
```

1. *Authenticate Git with your GitHub credentials?* → presiona **Enter** (Sí).
2. El código de un solo uso (formato `XXXX-XXXX`) ya quedó copiado (si la Terminal dice *First copy your one-time
   code*, cópialo de ahí). Presiona **Enter**: se abre
   <https://github.com/login/device> en el navegador.
3. Pega el código (**⌘ + V**) → **Continue** → **Authorize github**. Si GitHub te pide tu verificación en dos pasos
   (2FA), complétala; es normal.
4. Vuelve a la Terminal: debe decir `✓ Logged in as tu-usuario`.

> Si tu navegador tiene abierta **otra** cuenta de GitHub (por ejemplo una personal distinta a la invitada), cierra esa
> sesión en github.com antes de pegar el código. Si no, en el punto 4 verás otro usuario y la descarga del paso 4
> fallará; en ese caso repite este paso.

---

## 4. Descarga Katana NP

```bash
gh repo clone Aizcream/katana-np ~/Katana
```

Esto crea la carpeta **Katana** en tu carpeta de usuario (`/Users/tu-usuario/Katana`). Ahí también quedarán tus
proyectos. **No la muevas ni le cambies el nombre** (si lo haces, vuelve a ejecutar `./install.sh` dentro de ella).

- Si dice *«Could not resolve to a Repository»* → no aceptaste la invitación (paso 0) o iniciaste sesión con otra
  cuenta en el paso 3 (compruébalo con `gh auth status`).
- Si dice *«already exists and is not an empty directory»* (o *«ya existe y no es un directorio vacío»*) → ya lo
  descargaste antes: sigue al paso 5.

**¿Prefieres GitHub Desktop?** *File → Clone Repository… → GitHub.com* → elige `Aizcream/katana-np` y en **Local Path**
escribe `/Users/TU-USUARIO/Katana` (cambia TU-USUARIO por tu usuario del Mac). Pulsa **Clone** y sigue en el paso 5.
**No uses «Download ZIP»**: sin la carpeta `.git` no podrás actualizar.

---

## 5. Instala todo con un solo comando

```bash
cd ~/Katana && ./install.sh
```

El instalador hace 8 pasos y muestra **✓** (bien), **⚠** (opcional) o **✗** (hay que arreglar):

1. **Homebrew** — lo comprueba.
2. **Herramientas de Apple** — si no las tienes, **se abre una ventana** pidiendo instalar las *Command Line Tools*:
   pulsa **Instalar**, acepta, espera (5–10 min) y **vuelve a ejecutar** `cd ~/Katana && ./install.sh`.
3. **Programas** — instala lo que falte: ffmpeg, Node, Python, whisper.cpp y Google Chrome (Katana usa Chrome en
   segundo plano para dibujar cada cuadro; no se abre ninguna ventana).
4. **Python** — crea un entorno propio en `Katana/.venv`.
5. **OCR, recorte de fondo y QA** — los compila.
6. **Modelos de transcripción** — descarga ~570 MB (para subtítulos automáticos en español).
7. **Skill `/katana`** — la conecta con Claude Code.
8. **Diagnóstico** — renderiza un video de prueba de 2 segundos y transcribe una frase.

Al final debe decir **«Katana NP está listo.»** Si algo sale con ✗, el mensaje dice qué hacer; arréglalo y vuelve a
ejecutar `./install.sh` (es seguro repetirlo y recuerda las opciones que usaste antes, como `--no-whisper`).

- ¿Sin espacio o sin necesidad de subtítulos automáticos? Usa `cd ~/Katana && ./install.sh --no-whisper` (ahorra 570 MB).
- **(Opcional, 2 min)** Descarga los tres videos de Higgsfield en los que se basan los estilos predefinidos de Katana NP
  (Claude los usa si le pides uno de esos estilos): `cd ~/Katana && ./katana refs`

---

## 6. (Opcional) Conecta tus cuentas de voz y de IA

Cada persona usa **sus propias** claves. Se guardan solo en tu usuario del Mac; nunca se suben al repositorio.

**ElevenLabs** (locuciones con voz):
1. En la Terminal ejecuta este comando: te pedirá que copies la clave y esperará.

```bash
cd ~/Katana && ./katana keys elevenlabs
```

2. Entra a <https://elevenlabs.io> → abajo a la izquierda **Developers** → **API Keys** → **Create API Key**.
   Permisos: *Text to Speech* (acceso), *Voices* (escribir), *User* (leer).
3. La clave **solo se muestra una vez**: pulsa el botón de **copiar** que está a su lado. No la pegues en ningún lado
   (tampoco en el chat de Claude) y no copies nada más.
4. Vuelve a la Terminal y presiona **Enter**.

Si salió bien verás una línea (en inglés) como `plan free (active) · used 0 / 10,000 credits · left 10,000 …`. La clave
se guarda solo para tu usuario del Mac y el portapapeles queda vacío. Importante: con el **plan gratuito** de ElevenLabs
solo funcionan las voces *premade* y no tienes licencia comercial (si publicas, debes poner «elevenlabs.io» en el
título). Para anuncios o clientes necesitas un plan pago (Starter, desde US$6/mes).

**Higgsfield** (solo para generar escenas con IA; la mayoría de videos no lo necesitan):

```bash
cd ~/Katana && ./install.sh --with-higgsfield --no-doctor && ./katana keys higgsfield
```

Te pide copiar primero el *Key ID* y luego el *Key Secret*. Créalos en <https://cloud.higgsfield.ai> → **API Keys** (el
secreto se muestra una sola vez). La API usa un **saldo prepagado propio**, distinto de los créditos de la suscripción de
higgsfield.ai. Claude siempre te dirá el costo en dólares y esperará tu OK antes de gastar.

---

## 7. Abre Katana NP en Claude Code

1. Si la app **Claude** estaba abierta mientras instalabas, ciérrala del todo (**⌘ + Q**) y vuelve a abrirla.
2. Abre **Claude** → pestaña **Code**.
3. Debajo del cuadro de mensaje hay una fila de controles:
   - En el del **entorno**, elige **Local** (Katana NP trabaja en tu Mac; en *Cloud* o en la pestaña *Cowork* no existe).
   - En el de la **carpeta**, elige **Open folder…** y selecciona **Katana**. En esa ventana, **⌘ + Shift + H** te lleva
     a tu carpeta de usuario, donde está *Katana*.
4. En el cuadro de mensaje escribe **/** : aparece un menú. Elige **katana** y, en el mismo mensaje, escribe lo que
   quieres (ver el paso 8). Si `katana` no aparece, empieza una sesión nueva o cierra Claude (**⌘ + Q**) y ábrelo de nuevo.
5. La primera vez, Claude te pedirá permiso para ejecutar comandos en la Terminal: acéptalos (son las herramientas de
   Katana NP).

¿Prefieres la Terminal? Instala Claude Code una vez con `curl -fsSL https://claude.ai/install.sh | bash`, abre una
Terminal nueva y luego `cd ~/Katana && claude`; escribe `/katana …` igual.

---

## 8. Haz tu primer video

**Cómo pasarle tus archivos a Claude**
- Copia tus tomas, logos, fotos y el video de referencia en la carpeta **Katana/entrada** (ábrela con
  `open ~/Katana/entrada`).
- En el mensaje, nómbralos (por ejemplo «usa entrada/toma1.mov»). No hace falta arrastrarlos.
- **Links:** Katana NP solo descarga videos de **X (Twitter)**. Si la referencia está en Instagram, TikTok o YouTube,
  guárdala primero en tu Mac y ponla en *entrada*.
- Si grabaste con iPhone, los videos suelen ser **HDR**: díselo a Claude para que los pase a SDR antes de usarlos.

**Ejemplo de mensaje:**

> /katana Haz un reel 9:16 de 20 s con el ritmo y el estilo de entrada/referencia.mp4. Es para [tu producto o cliente]:
> [mensaje y datos]. Usa las tomas entrada/toma1.mov y entrada/toma2.mov, el logo entrada/logo.png y una locución con
> ElevenLabs. Cierre: "Escríbenos, link en la bio".

Claude analiza la referencia, te muestra un **brief** corto (apruébalo o corrígelo), te enseña fotos fijas, luego un
borrador y al final el video. El render final de un reel de 20 s tarda unos 4–6 minutos.

- **Tus videos quedan en** `~/Katana/projects/<nombre>/renders/` (el final se llama `final_…mp4`). Para abrir la
  carpeta: `open ~/Katana/projects`
- **Para pedir cambios**, di el segundo y qué cambiar: *«en 0:06 el texto es muy pequeño»*.

Más detalles: `~/Katana/README.md`. Ejemplos de código real: `~/Katana/examples/`.

---

## Actualizar a la última versión

```bash
cd ~/Katana && ./katana update
```

Descarga los cambios y vuelve a comprobar todo. Tus proyectos, la carpeta *entrada*, tus claves y los modelos no se
tocan. (Con GitHub Desktop: **Fetch origin → Pull origin** y luego `cd ~/Katana && ./install.sh --quick`.)

---

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `zsh: command not found: brew` después de instalar Homebrew | Pega el comando largo del paso 2 (el de `brew shellenv`) o cierra y abre la Terminal. |
| `brew` dice *not writable* o *Permission denied* en `/opt/homebrew` | Homebrew lo instaló otro usuario de este Mac. Pídele a esa persona que, desde su usuario, ejecute `brew install gh node ffmpeg whisper.cpp` y `brew install --cask google-chrome`. Luego tú ejecuta el comando del paso 2 (`brew shellenv`) y `cd ~/Katana && ./install.sh`. |
| `Could not resolve to a Repository` al descargar | Acepta la invitación de GitHub y verifica con `gh auth status` que iniciaste sesión con la cuenta invitada. |
| `./install.sh: Permission denied` | `chmod +x ~/Katana/install.sh ~/Katana/katana` y vuelve a intentarlo. |
| La ventana de *Command Line Tools* no aparece | Ejecuta `xcode-select --install`; si dice que ya están instaladas, sigue normal. |
| *Node 22 o más nuevo no encontrado* (usas nvm) | `nvm install 22 && nvm alias default 22`, abre una Terminal nueva y `cd ~/Katana && ./install.sh`. |
| En Claude Code, `/katana` no aparece | Empieza una sesión nueva, o cierra Claude (**⌘ + Q**) y ábrelo de nuevo. Revisa que el entorno sea **Local**. Comprueba con `~/Katana/katana doctor` que diga *skill /katana enlazada*. |
| El render de prueba falla | El diagnóstico te muestra un comando `open …doctor_render.log`: ábrelo y envía ese archivo a quien te compartió Katana. Casi siempre es Chrome: `brew install --cask google-chrome`. |
| `./katana update` pide usuario o contraseña | `gh auth setup-git` y vuelve a intentarlo. |
| `./katana update` dice *git pull falló* | Algún archivo de Katana cambió en tu Mac. Guarda esos cambios aparte y actualiza: `cd ~/Katana && git -c user.name=Katana -c user.email=katana@localhost stash && ./katana update`. Si sigue fallando, envía la salida de `cd ~/Katana && git status` a quien te compartió Katana. |
| ElevenLabs responde *voice: 401* | La clave o sus permisos están mal: crea otra con los permisos del paso 6 y repite `cd ~/Katana && ./katana keys elevenlabs`. |
| ElevenLabs responde *paid_plan_required* | Con el plan gratuito solo funcionan las voces *premade*. |
| Cualquier otra cosa | Copia el diagnóstico con el comando de abajo y pégalo en un mensaje a quien te compartió Katana. |

```bash
~/Katana/katana doctor 2>&1 | pbcopy
```

---

## Desinstalar

```bash
for s in katana higgsfield-api; do [ -L ~/.claude/skills/$s ] && rm ~/.claude/skills/$s; done; ls ~/.config/katana/backup 2>/dev/null; echo "Listo."
```

Si antes de «Listo.» aparece algún nombre, es una skill tuya que el instalador apartó: en Finder pulsa **⌘ + Shift + G**,
escribe `~/.config/katana/backup` y muévela de vuelta a `~/.claude/skills` (quítale la fecha del nombre). Después borra
la configuración de Katana con `rm -rf ~/.config/katana` y, en Finder, mueve la carpeta **Katana** (en tu carpeta de
usuario) a la Papelera; guarda antes lo que quieras de `Katana/projects` y `Katana/entrada`. Tus claves están en
`~/.config/elevenlabs` y `~/.config/higgsfield` por si quieres borrarlas también. Los programas de Homebrew se quedan; si
no los usas para nada más: `brew uninstall ffmpeg node whisper.cpp gh && brew uninstall --cask google-chrome` (quita del
comando lo que no instalaste con Katana, o fallará).

---

## Para quien comparte Katana NP

- **Solo la primera vez:** publica el repositorio privado desde tu carpeta Katana
  (`gh repo create Aizcream/katana-np --private --source . --remote origin --push`) y ejecuta `./install.sh` en esa
  carpeta para que tu propio `/katana` apunte al repositorio.
- Cada persona necesita una cuenta de GitHub (gratis) y te envía su **nombre de usuario**.
- **Invitar** (desde tu Mac, con `gh` conectado a la cuenta Aizcream): `gh api -X PUT repos/Aizcream/katana-np/collaborators/USUARIO`.
  El repositorio está en una cuenta personal, así que GitHub no permite solo lectura: cada invitado puede subir cambios.
  (Si lo pasas a una organización de GitHub, puedes dar solo lectura con
  `gh api -X PUT repos/ORGANIZACION/katana-np/collaborators/USUARIO -f permission=pull`.)
- La invitación caduca a los 7 días: para reenviarla, repite el comando.
- Quitar el acceso: `gh api -X DELETE repos/Aizcream/katana-np/collaborators/USUARIO`. Si la invitación aún no fue
  aceptada, búscala con `gh api repos/Aizcream/katana-np/invitations --jq '.[] | "\(.id) \(.invitee.login)"'` y bórrala con
  `gh api -X DELETE repos/Aizcream/katana-np/invitations/ID`.
- Publicar una mejora para todos: haz commit y `git push` en tu carpeta Katana; los demás ejecutan `./katana update`.
- Si cambias el dueño del repositorio, actualiza `Aizcream/katana-np` en esta guía (pasos 0 y 4) y en `skills/katana/SKILL.md`.

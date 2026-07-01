# VForge Inspector

Extension de Chrome (Manifest V3). Click en cualquier elemento de cualquier pagina, escribe que esta mal, y se manda directo a la cola `dispatch_queue` del Brain Vulcano — sin backend propio, sin pasar por chat.

## Instalacion (unpacked)

1. Descarga o clona este repo.
2. Abre `chrome://extensions`.
3. Activa **Modo desarrollador** (arriba a la derecha).
4. Click en **Cargar descomprimida** y selecciona la carpeta del repo.
5. El icono aparece en la barra de Chrome.

## Configuracion inicial

1. Click en el icono de la extension (abre el side panel).
2. Llena:
   - **Secret del relay** — el secret de tu Hetzner (el mismo que usas en `/brain/*`).
   - **Dominio / proyecto activo** — opcional, ej. `vforge.site`.
   - **Agente destino** — `claude_code` por default.
3. Click en **Guardar configuracion**.

## Uso

1. Entra a cualquier pagina (ej. vforge.site).
2. Activa el inspector: boton flotante violeta abajo a la derecha, o `Alt+Shift+V`.
3. Mueve el mouse — el elemento bajo el cursor se resalta en cyan.
4. Click en el elemento roto. Aparece un pin numerado y un panel chico.
5. Escribe en tus palabras que esta mal y click en **Mandar a Claude Code**.
6. Se captura screenshot (guardado local en `chrome.storage.local`), se arma el prompt con selector + URL + tu nota, y se hace POST a:

```
POST http://178.105.135.26/brain/vulcano/enqueue
{
  "secret": "<tu secret>",
  "prompt": "...",
  "agent": "claude_code",
  "priority": 7,
  "source": "vforge-inspector-plugin"
}
```

7. En el side panel ves todos los pines de la sesion con su estado (pendiente / enviado / error) y puedes reintentar los que fallaron.

## Notas

- El endpoint esta hardcodeado a tu relay de Hetzner (`178.105.135.26`). El secret NUNCA se hardcodea — vive solo en `chrome.storage.local` de tu navegador.
- Funciona en cualquier dominio, no solo VForge.
- Los screenshots se guardan localmente bajo la clave `screenshot_<pinId>` — no se suben al relay (solo el texto del prompt via POST).
- Atajo: `Alt+Shift+V` activa/desactiva el modo inspector.

## Permisos

- `activeTab`, `tabs` — capturar la pestaña visible.
- `scripting` — inyectar el content script.
- `storage` — guardar pines, screenshots y config localmente.
- `sidePanel` — la UI de la derecha.
- `<all_urls>` — funciona en cualquier sitio.

# Remote Control

FellowShow provides two remote control protocols for external integration: **OSC** (Open Sound Control) and **HTTP API**. These allow you to control broadcasts, navigate verses, switch themes, and adjust settings from hardware controllers, automation scripts, or custom dashboards.

## Overview

Remote control enables you to:
- **Navigate verses** - Advance or go back through your verse queue
- **Control broadcast** - Show/hide output, toggle on-air status
- **Switch themes** - Change active broadcast theme by name
- **Adjust settings** - Modify confidence threshold and opacity
- **Monitor status** - Query current state via HTTP API

## Supported Protocols

| Protocol | Port | Transport | Best For |
|----------|------|-----------|----------|
| **OSC** | 8000 | UDP | Hardware controllers (Stream Deck, TouchOSC, Companion) |
| **HTTP** | 8080 | TCP/HTTP | REST clients, automation scripts, custom dashboards |

Both protocols support the same command set and can run simultaneously.

## Setup

### Enabling Remote Control

1. **Open Settings** (⚙️ gear icon)
2. Navigate to the **Remote** tab
3. Configure OSC and/or HTTP:

#### OSC (Open Sound Control)

- **Toggle**: Enable/disable OSC listener
- **Port**: Default `8000` (UDP)
- **Host**: Binds to `127.0.0.1` (this computer only)

#### HTTP API

- **Toggle**: Enable/disable HTTP server
- **Port**: Default `8080` (TCP)
- **Host**: Binds to `127.0.0.1` (this computer only)

### Network security

Remote control is intentionally loopback-only. Run controllers such as Companion
on the FellowShow computer. LAN access is disabled until an authenticated remote
mode is available; do not expose these ports through a proxy or port forward.

## Available Commands

All commands are case-insensitive and use the same structure across both protocols.

### 1. **next** — Advance to Next Verse

Moves forward in the verse queue and presents the next verse.

**OSC:**
```
/fellowshow/next
```

**HTTP:**
```bash
curl -X POST http://localhost:8080/api/v1/command \
  -H "Content-Type: application/json" \
  -d '{"command":"next"}'
```

### 2. **prev** — Go to Previous Verse

Moves backward in the verse queue and presents the previous verse.

**OSC:**
```
/fellowshow/prev
```

**HTTP:**
```bash
curl -X POST http://localhost:8080/api/v1/command \
  -H "Content-Type: application/json" \
  -d '{"command":"prev"}'
```

### 3. **show** — Show Broadcast Output

Makes the broadcast output visible (sets live state to true).

**OSC:**
```
/fellowshow/show
```

**HTTP:**
```bash
curl -X POST http://localhost:8080/api/v1/command \
  -H "Content-Type: application/json" \
  -d '{"command":"show"}'
```

### 4. **hide** — Hide Broadcast Output

Hides the broadcast output (sets live state to false).

**OSC:**
```
/fellowshow/hide
```

**HTTP:**
```bash
curl -X POST http://localhost:8080/api/v1/command \
  -H "Content-Type: application/json" \
  -d '{"command":"hide"}'
```

### 5. **on_air** — Toggle On-Air Status

Sets the broadcast live state to a specific value.

**Parameters:**
- `value` (boolean): `true` to go live, `false` to go off-air

**OSC:**
```
/fellowshow/on_air true
/fellowshow/on_air false
```

**HTTP:**
```bash
curl -X POST http://localhost:8080/api/v1/command \
  -H "Content-Type: application/json" \
  -d '{"command":"on_air","value":true}'
```

### 6. **theme** — Switch Active Theme

Changes the active broadcast theme by name (case-insensitive).

**Parameters:**
- `value` (string): Theme name (e.g., "Classic Dark", "Minimal", "Bold")

**OSC:**
```
/fellowshow/theme "Classic Dark"
/fellowshow/theme "Minimal"
```

**HTTP:**
```bash
curl -X POST http://localhost:8080/api/v1/command \
  -H "Content-Type: application/json" \
  -d '{"command":"theme","value":"Classic Dark"}'
```

### 7. **opacity** — Set Broadcast Opacity

Adjusts the opacity of the broadcast output.

**Parameters:**
- `value` (float): Opacity from 0.0 (transparent) to 1.0 (opaque)

**OSC:**
```
/fellowshow/opacity 0.75
/fellowshow/opacity 1.0
```

**HTTP:**
```bash
curl -X POST http://localhost:8080/api/v1/command \
  -H "Content-Type: application/json" \
  -d '{"command":"opacity","value":0.75}'
```

### 8. **confidence** — Set Detection Confidence Threshold

Adjusts the minimum confidence threshold for verse detection.

**Parameters:**
- `value` (float): Confidence threshold from 0.0 to 1.0

**OSC:**
```
/fellowshow/confidence 0.8
```

**HTTP:**
```bash
curl -X POST http://localhost:8080/api/v1/command \
  -H "Content-Type: application/json" \
  -d '{"command":"confidence","value":0.8}'
```

## HTTP API Endpoints

The HTTP API provides additional endpoints for querying status.

### GET /api/v1/status

Returns current application status snapshot.

**Request:**
```bash
curl http://localhost:8080/api/v1/status
```

**Response:**
```json
{
  "on_air": true,
  "active_theme": "Classic Dark",
  "live_verse": "John 3:16",
  "queue_length": 12,
  "confidence_threshold": 0.75
}
```

### POST /api/v1/command

Executes a remote command (see Available Commands above).

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/command \
  -H "Content-Type: application/json" \
  -d '{"command":"next"}'
```

**Response:**
```json
{
  "success": true
}
```

## Integration Examples

### Elgato Stream Deck (via Companion)

[Bitfocus Companion](https://bitfocus.io/companion) provides Stream Deck integration with OSC support.

1. **Install Companion** and configure your Stream Deck
2. **Add Generic OSC module**:
   - Host: `127.0.0.1` (or your FellowShow computer's IP)
   - Port: `8000`
3. **Create buttons** for each command:
   - **Next Verse**: OSC path `/fellowshow/next`
   - **Prev Verse**: OSC path `/fellowshow/prev`
   - **Show Output**: OSC path `/fellowshow/show`
   - **Hide Output**: OSC path `/fellowshow/hide`
   - **Go Live**: OSC path `/fellowshow/on_air` with argument `true`

### TouchOSC / Lemur

Mobile control surfaces can send OSC commands directly.

**TouchOSC Example:**
1. Create buttons with OSC message type
2. Set destination to FellowShow computer IP:8000
3. Configure OSC addresses:
   - `/fellowshow/next`
   - `/fellowshow/prev`
   - `/fellowshow/show`
   - `/fellowshow/hide`

### Node.js / JavaScript Automation

**Using HTTP API:**

```javascript
const FELLOWSHOW_URL = 'http://localhost:8080/api/v1';

async function nextVerse() {
  await fetch(`${FELLOWSHOW_URL}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'next' })
  });
}

async function setTheme(themeName) {
  await fetch(`${FELLOWSHOW_URL}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'theme', value: themeName })
  });
}

async function getStatus() {
  const res = await fetch(`${FELLOWSHOW_URL}/status`);
  return res.json();
}

// Usage
await nextVerse();
await setTheme('Minimal');
const status = await getStatus();
console.log(status);
```

**Using OSC (via `osc` npm package):**

```javascript
import { Client } from 'osc';

const osc = new Client('localhost', 8000);

// Send commands
osc.send('/fellowshow/next');
osc.send('/fellowshow/prev');
osc.send('/fellowshow/theme', 'Classic Dark');
osc.send('/fellowshow/opacity', 0.8);
osc.send('/fellowshow/on_air', true);
```

### Python Automation

**Using HTTP API:**

```python
import requests

FELLOWSHOW_URL = 'http://localhost:8080/api/v1'

def next_verse():
    requests.post(f'{FELLOWSHOW_URL}/command',
                  json={'command': 'next'})

def set_theme(theme_name):
    requests.post(f'{FELLOWSHOW_URL}/command',
                  json={'command': 'theme', 'value': theme_name})

def get_status():
    response = requests.get(f'{FELLOWSHOW_URL}/status')
    return response.json()

# Usage
next_verse()
set_theme('Minimal')
status = get_status()
print(status)
```

**Using OSC (via `python-osc` package):**

```python
from pythonosc import udp_client

osc = udp_client.SimpleUDPClient('localhost', 8000)

# Send commands
osc.send_message('/fellowshow/next', [])
osc.send_message('/fellowshow/prev', [])
osc.send_message('/fellowshow/theme', 'Classic Dark')
osc.send_message('/fellowshow/opacity', 0.8)
osc.send_message('/fellowshow/on_air', True)
```

### OBS Studio Integration

While FellowShow uses NDI for video output, you can use remote control for automation:

**OBS Advanced Scene Switcher + Shell Command:**

```bash
#!/bin/bash
# next-verse.sh
curl -X POST http://localhost:8080/api/v1/command \
  -H "Content-Type: application/json" \
  -d '{"command":"next"}'
```

Configure OBS hotkeys or macros to trigger this script.

## Monitoring & Debugging

### Command Log

The Settings → Remote tab shows a real-time **Command Log** displaying:
- Timestamp of each received command
- Source (OSC or HTTP)
- Command type

Use this to verify your integration is working correctly.

### Troubleshooting

#### Commands Not Received

1. **Check Server Status**
   - Settings → Remote → Verify OSC/HTTP shows "Running"
   - Confirm correct port numbers

2. **Test Locally First**
   ```bash
   # Test HTTP locally
   curl -X POST http://localhost:8080/api/v1/command \
     -H "Content-Type: application/json" \
     -d '{"command":"next"}'
   ```

3. **Firewall Issues**
   - Allow incoming connections on OSC/HTTP ports
   - On macOS: System Preferences → Security & Privacy → Firewall

4. **Network Issues**
   - Verify computer IP address: `ifconfig` (macOS/Linux) or `ipconfig` (Windows)
   - Test connectivity: `ping <fellowshow-computer-ip>`
   - Ensure both devices on same network (if remote)

#### Port Already in Use

If you see "Port already in use" error:
- Change the port number in settings
- Check what's using the port: `lsof -i :8000` (macOS/Linux)
- Kill conflicting process or choose different port

#### OSC vs HTTP - Which to Use?

**Use OSC if:**
- Integrating with hardware controllers
- Using Companion, TouchOSC, QLab, etc.
- Need low-latency, fire-and-forget commands
- Already have OSC infrastructure

**Use HTTP if:**
- Building custom web dashboards
- Scripting automation tasks
- Need request/response confirmation
- Querying status information
- Prefer REST-style APIs

## Security Considerations

### Network Exposure

By default, both OSC and HTTP bind to `0.0.0.0`, making them accessible from any device on your network.

**For local-only access:**
- Bind to `127.0.0.1` instead (requires editing settings)
- This prevents remote network access

**For production environments:**
- Use firewall rules to restrict access
- Consider VPN or SSH tunneling for remote access
- HTTP does not include authentication (add reverse proxy with auth if needed)

### Command Validation

All commands are validated before execution:
- Invalid JSON is rejected (HTTP)
- Unknown commands are ignored
- Parameter types are checked (float/string/bool)

## Technical Details

### OSC Implementation

- **Transport**: UDP
- **Library**: Custom parser built on `tokio` async runtime
- **Message Format**: Standard OSC bundle/message format
- **Address Pattern**: `/fellowshow/<command>`
- **Arguments**: Matched positionally to command parameters

### HTTP Implementation

- **Framework**: Axum (Rust async web framework)
- **Transport**: TCP with keep-alive
- **Content-Type**: `application/json`
- **CORS**: Disabled by default (local use only)

### Command Flow

1. **Receive**: OSC/HTTP listener receives command
2. **Parse**: Convert to unified `RemoteCommand` enum
3. **Validate**: Type-check parameters
4. **Dispatch**: Route to appropriate store action
5. **Execute**: Update application state
6. **Log**: Record in command log (if enabled)

### Status Sync

The HTTP status endpoint is updated every 1000ms (1 second) with a snapshot from the frontend:
- On-air state
- Active theme name
- Live verse reference
- Queue length
- Confidence threshold

This ensures the `/api/v1/status` endpoint always returns current data.

## Future Enhancements

Planned additions to remote control:

- **WebSocket API** for real-time bidirectional communication
- **MIDI support** for hardware controllers with MIDI over USB
- **Authentication** for HTTP API (API keys or OAuth)
- **Custom command macros** (trigger multiple commands at once)
- **Verse navigation by reference** (e.g., `/fellowshow/goto John 3:16`)
- **Queue management** (add/remove/reorder verses remotely)

## Support

For issues or questions:
- Check the main [README](../README.md)
- Consult [Whisper Documentation](./whisper.md) for transcription setup
- Report bugs on GitHub
- Check logs in Console.app (macOS) or terminal output

---

**Next Steps:**
- Learn about [Whisper Transcription](./whisper.md) for local speech-to-text
- See [README](../README.md) for general usage and setup

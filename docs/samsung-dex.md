# Samsung DeX Support

FutureBuddy works with Samsung DeX so you can use voice commands, the grid overlay, and all other accessibility features on an external monitor or TV.

## What You Need

- A Samsung Galaxy phone that supports DeX (Galaxy S8 or newer, most Galaxy A series)
- One of the following:
  - USB-C to HDMI cable or adapter
  - A DeX Station / DeX Pad
  - A Miracast-compatible TV or monitor (for Wireless DeX)
- FutureBuddy installed with the accessibility service enabled

## How It Works

### Mirror Mode

Your phone screen is duplicated on the external display. Everything you see on your phone appears on the monitor too — grid, speech bubble, floating button, help menu, everything. This just works automatically, no extra setup needed.

### Extend Mode

Your phone and monitor show different things — the monitor becomes a full desktop. FutureBuddy detects the external display and automatically draws all active overlays on both screens:

- Grid overlay appears on both phone and monitor
- Speech bubble (listening indicator) appears on both
- Floating button appears on both
- Help/commands menu appears on both

**Note:** Tap targets from the grid (saying "3a" to tap a spot) work on the phone screen only. This is an Android limitation — gesture dispatch only targets the primary display.

## Setup

1. Connect your phone to an external display (cable or wireless)
2. Samsung DeX should activate automatically (or enable it from Quick Settings)
3. FutureBuddy will detect the external display and start mirroring overlays

That's it. No settings to change in FutureBuddy.

## Voice Commands

You can control DeX mode with your voice:

| Command | What It Does |
|---|---|
| **"dex mirror"** or **"mirror display"** | Toggle DeX (mirror mode) |
| **"dex extend"** or **"extend display"** | Toggle DeX (extend mode) |
| **"dex off"** or **"disconnect dex"** | Turn off DeX |
| **"wireless dex on/off"** | Toggle wireless DeX |

These commands toggle the DeX Quick Settings tile, same as tapping it manually.

## Tips

- **Use earbuds or a headset.** Voice recognition works much better when the mic isn't picking up speaker output from the monitor.
- **The grid on the monitor is visual only.** When you say a grid cell like "5b", the tap happens on your phone screen. This is useful in mirror mode since both screens show the same content.
- **Overlays update automatically.** If you connect or disconnect the external display while FutureBuddy is running, overlays will appear or clean up on their own.
- **Resolution changes are handled.** If the external display resolution changes (e.g., switching monitors), the grid and overlays will redraw to fit.

## Troubleshooting

**Overlays don't appear on the external display**
- Make sure you're in DeX Extend mode (not mirror). In mirror mode, overlays appear automatically since the screen is duplicated.
- Try saying "grid" to toggle the grid — it should appear on both screens.
- Restart the FutureBuddy accessibility service: Settings > Accessibility > FutureBuddy > toggle off and on.

**Grid taps hit the wrong spot in extend mode**
- This is expected. Grid taps go to the phone screen, not the external display. In extend mode, the phone and monitor show different content, so taps from the grid won't match what's on the monitor.
- In mirror mode, taps work correctly since both screens show the same thing.

**DeX voice commands don't work**
- These commands toggle Quick Settings tiles. If Samsung changed the tile name in a software update, the command may not find the right tile. Try toggling DeX manually from Quick Settings instead.

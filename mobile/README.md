# Parking Lot Mobile

Local-first notes app for Android, built with Expo + React Native + SQLite.

## Run On Windows

Open a terminal in `mobile` and run:

```powershell
cd C:\Users\ASPulido\Documents\GitHub\Parking-Lot\mobile
cmd.exe /c npm.cmd install
cmd.exe /c npm.cmd start -- --clear
```

Keep that terminal open.

## Open On Android Emulator

1. Open Android Studio.
2. Start your `Pixel 6` emulator in `Device Manager`.
3. When Expo is running, press `a` in the terminal to open the app.
4. If the app does not appear, switch to the emulator window and press `r` to reload.

## If It Gets Stuck

- If Metro shows an error, stop it with `Ctrl+C` and run `npm.cmd start -- --clear` again.
- If the emulator is running but Expo cannot connect, restart the emulator from `Device Manager`.
- If the package versions warn after install, run `npm.cmd install` again once more from `mobile`.

## Stack

- Expo
- React Native
- TypeScript
- `expo-sqlite` for local persistence

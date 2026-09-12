# Android Adapter (deferred)

Not scaffolded yet — a real Android Studio/Gradle project needs the Android
SDK installed locally, which this setup pass didn't assume. What it owns
per the master doc (§13, §23):

- Reads notifications, accessibility events, and voice input with explicit
  permissions.
- Renders the Agent Surface as a floating overlay.
- Normalizes everything into the same shape as
  `apps/core/src/adapters/android.ts` (`normalizeAndroidEvent`) and POSTs it
  to `POST /events/android` on the Agent Core.

When you're ready to build it: `android/` here as a native Kotlin project
(min SDK per current Play requirements), talking to the Agent Core over
plain HTTP/WebSocket — no separate protocol needed.

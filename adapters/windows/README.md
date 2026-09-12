# Windows Adapter (deferred)

Not scaffolded yet — same reasoning as `adapters/android/README.md`. What
it owns per the master doc (§13, §23):

- Desktop surface, notifications, and whatever automation/capabilities
  Windows exposes.
- Normalizes into `apps/core/src/adapters/windows.ts`
  (`normalizeWindowsEvent`) and POSTs it to `POST /events/windows` on the
  Agent Core.

For the hackathon demo (§22, §25) this can start as a controlled/simulated
event source instead of a full native client — the doc explicitly allows
one platform (Android) to carry the real deep-access demo while this one
is "presented as extensible architecture."

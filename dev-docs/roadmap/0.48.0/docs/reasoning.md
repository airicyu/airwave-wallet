# 0.48.0 — why

Idle lock is off until the user turns it on. The default of 10 minutes is stored so the field is not empty when they do.

The countdown is the time since the last wallet surface closed, not time since the last click inside an open page. An open popup, side panel, or sign popout is in use even on Settings. Clicks inside an open surface are not a second activity signal.

The clock cannot live in the popup or the side panel. Those documents being open is the condition that stops the timer. `chrome.alarms` survives a service-worker stop and wakes the worker when the delay ends. A `setTimeout` in the worker does not. `chrome.idle` is out of scope: this version measures wallet surfaces, not OS input.

A worker wake is not a new idle period. If `airwave.idleLock` is already scheduled, startup leaves that time. Startup also does not create an alarm when none is scheduled. Creating the same name again would start the minutes over. An open document whose port died with the worker is still a surface on that start path: `getContexts` counts it the same as a live port, and the document connects the port again. The alarm is created from a last-port disconnect, and that disconnect does not ask `getContexts`, because the closing document can still be listed.

Unlock material already lives in service-worker memory plus `chrome.storage.session`. If the worker restarts, session hydrate can still be unlocked while the in-memory surface count is zero. The alarm handler therefore checks `chrome.runtime.getContexts` before calling `session.lock()`. A port per surface document is what clears the alarm on open and schedules it when the last one disconnects. The side panel's existing port stays the 0.39.0 close-rejects-sign signal. Idle lock does not reuse that disconnect to reject a pending request.

Firing the alarm calls the same `session.lock()` as `wallet.lock`. A sign screen that is showing is a surface, so the alarm is not running then. A pending request with no surface is left as a manual lock leaves it.

Minutes are a single integer, 1 through 1440, not a list of presets. 1440 is one day. That bound keeps `delayInMinutes` inside a range the alarms API accepts and keeps the field finite. Values outside the range do not write.

The API key change is separate. Edit already shows the draft, so an eye on that row can mask the field and make it read-only while confirm and discard are still there. Removing the eye from `loading` and `editing` leaves idle reveal as it is.

import { bindPopoutWindow } from "./pending";

export async function openPopout(requestId: string): Promise<void> {
  const url = chrome.runtime.getURL(
    `src/popout/index.html?requestId=${encodeURIComponent(requestId)}`,
  );
  const win = await chrome.windows.create({
    url,
    type: "popup",
    width: 420,
    height: 640,
    focused: true,
  });
  if (win.id != null) bindPopoutWindow(win.id, requestId);
}

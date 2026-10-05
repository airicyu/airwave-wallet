import { mountApprovalShell } from "../approval/shell";

const params = new URLSearchParams(location.search);
const requestId = params.get("requestId");

if (!requestId) {
  document.body.innerHTML = "<p>缺少 requestId</p>";
} else {
  mountApprovalShell(
    {
      requestId,
      host: "popout",
      callbacks: {
        onClose: () => window.close(),
        onWalletSendReject: () => window.close(),
        onWalletSendSuccessExit: () => window.close(),
      },
    },
    document.getElementById("root")!,
  );
}

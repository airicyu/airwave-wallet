# Other-cluster blockhash

Same prep as `01`. Mainnet blockhash RPC `http://127.0.0.1:8787`.

1. Open `?rpc=http://127.0.0.1:8899&otherRpc=http://127.0.0.1:8787`. The log's other-cluster RPC must be the mock.
2. Sign transaction（另一叢集 blockhash，省略 chain）.

**Pass:** the cluster-mismatch notice is visible, Approve is disabled, and nothing is signed or sent. Then Reject or dismiss.

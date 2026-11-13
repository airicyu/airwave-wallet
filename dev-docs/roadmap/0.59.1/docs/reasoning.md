# 0.59.1 reasoning

0.59.0 formatted only native SOL (9 decimals) and printed every other private mint as base units. A 6-decimal USDC note of 401756 therefore showed as 401756 while the USD label, which already divided by decimals, stayed about $0.40. The Unshield amount field reused that raw string, so Max looked larger than the notes and the form said the balance was insufficient.

The balance line used `1.55rem`. "Private balance" plus a decimal amount did not fit the popup width. The same row is shared by Send, Shield, Unshield, and private Send, so the smaller size applies to all four.

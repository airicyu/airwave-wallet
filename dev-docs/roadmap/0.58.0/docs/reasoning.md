# 0.58.0 reasoning

Local wallets were appended to the create-combined draft on the first tap, so leaving the picker kept addresses the user had only highlighted. Confirm matches the paste screen: the draft changes only when the user commits.

The combined kebab jumped straight into the member sheet, so there was no place to remove the combined wallet account the way other accounts are removed from Manage. The kebab now opens that same Manage page. Manage combined wallet account is the old sheet. Remove combined wallet account deletes the row immediately, because a combined account holds no vault secret of its own.

Member trash still confirms. That removes one address from the list, not the account. Adding a local wallet to an existing combined account still applies on tap.

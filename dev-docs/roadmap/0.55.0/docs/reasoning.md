# Why 0.55.0 is harness-only

0.54.0 already shipped v1 signing and the first e2e scenarios. The follow-up in this tree tried to add a pixel-diff runner (`pngjs`, `pixelmatch`) and YAML `pass_if` blocks next to the same Pass sentences. Side panel goldens are 360×1064, so a one-pixel height change fails before any product check. Balance digits and addresses also change between wallets.

The useful part of that attempt is the small English shot list and the PNGs. 0.55.0 keeps those and drops the runner. An agent judges `look` lines by eye and reports a miss. Behavior scenarios keep one Pass paragraph so the skill does not have two contracts for the same step.

No wallet code ships here. The screens in the goldens are the 0.54.0 UI, recorded on branch `v0.55.0` at git `00ca880` (`manifest.json`).

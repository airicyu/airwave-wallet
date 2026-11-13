/**
 * UI copy catalog (zh-Hant / zh-Hans / en). Each key has all three locales.
 * Section tables live in messages/. This file is the only catalog other modules import.
 */
import type { UiLocale } from "../protocol";
import { accountsMessages } from "./messages/accounts";
import { approvalMessages } from "./messages/approval";
import { commonMessages } from "./messages/common";
import { homeMessages } from "./messages/home";
import { navMessages } from "./messages/nav";
import { privacyMessages } from "./messages/privacy";
import { settingsMessages } from "./messages/settings";

const messages = {
  ...navMessages,
  ...accountsMessages,
  ...settingsMessages,
  ...homeMessages,
  ...privacyMessages,
  ...approvalMessages,
  ...commonMessages,
} as const satisfies Record<string, Record<UiLocale, string>>;

export type MessageKey = keyof typeof messages;
export { messages };

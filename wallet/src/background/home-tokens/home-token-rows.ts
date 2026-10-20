/**
 * Merges per-owner home token rows into one row per mint, including USD totals.
 * Does not call RPC or Jupiter.
 */
import {
  NATIVE_SOL_ID,
  formatUsdLabel,
  sortHomeTokenRows,
  type HomeTokenMemberShare,
  type HomeTokenRow,
} from "../../shared/home";

function finiteUnitPriceFromRow(row: HomeTokenRow): number | undefined {
  if (row.usdTotal == null || !Number.isFinite(row.usdTotal)) return undefined;
  if (row.uiAmount <= 0 || !Number.isFinite(row.uiAmount)) return undefined;
  const unit = row.usdTotal / row.uiAmount;
  return Number.isFinite(unit) ? unit : undefined;
}

function mergedUsdFields(
  perOwner: Map<string, HomeTokenRow>,
  totalUi: number,
): { usdLabel: string; usdTotal?: number } {
  let sum = 0;
  let hasSum = false;
  for (const row of perOwner.values()) {
    if (row.usdTotal != null && Number.isFinite(row.usdTotal)) {
      sum += row.usdTotal;
      hasSum = true;
    }
  }
  if (hasSum) {
    return { usdLabel: formatUsdLabel(sum), usdTotal: sum };
  }
  for (const row of perOwner.values()) {
    const unit = finiteUnitPriceFromRow(row);
    if (unit != null) {
      const total = totalUi * unit;
      if (Number.isFinite(total)) {
        return { usdLabel: formatUsdLabel(total), usdTotal: total };
      }
    }
  }
  return { usdLabel: "—" };
}

export function mergeMultiOwnerRows(
  perOwner: { owner: string; rows: HomeTokenRow[] }[],
  ownerOrder: string[],
): HomeTokenRow[] {
  const orderIndex = new Map(ownerOrder.map((o, i) => [o, i]));
  const byId = new Map<
    string,
    {
      template: HomeTokenRow;
      totalUi: number;
      perOwner: Map<string, HomeTokenRow>;
    }
  >();

  for (const { owner, rows } of perOwner) {
    for (const row of rows) {
      let bucket = byId.get(row.id);
      if (!bucket) {
        bucket = { template: { ...row, members: undefined }, totalUi: 0, perOwner: new Map() };
        byId.set(row.id, bucket);
      }
      bucket.totalUi += row.uiAmount;
      bucket.perOwner.set(owner, row);
      if (row.iconUrl && !bucket.template.iconUrl) bucket.template.iconUrl = row.iconUrl;
      if (row.name && bucket.template.name === bucket.template.symbol) {
        bucket.template.name = row.name;
      }
    }
  }

  const merged: HomeTokenRow[] = [];
  for (const [id, bucket] of byId) {
    const total = bucket.totalUi;
    const template = bucket.template;
    const decimalsHint =
      id === NATIVE_SOL_ID ? 9 : Math.min(9, (template.uiAmountLabel.split(".")[1]?.length ?? 0) || 0);

    const members: HomeTokenMemberShare[] = [];
    const sortedOwners = [...bucket.perOwner.keys()].sort(
      (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0),
    );
    for (const owner of sortedOwners) {
      const row = bucket.perOwner.get(owner)!;
      if (row.uiAmount <= 0) continue;
      members.push({
        pubkey: owner,
        uiAmount: row.uiAmount,
        uiAmountLabel: row.uiAmountLabel,
        percent: total > 0 ? (100 * row.uiAmount) / total : 0,
      });
    }

    const usd = mergedUsdFields(bucket.perOwner, total);
    const mergedRow: HomeTokenRow = {
      ...template,
      id,
      uiAmount: total,
      uiAmountLabel: total.toLocaleString(undefined, {
        maximumFractionDigits: id === NATIVE_SOL_ID ? 9 : decimalsHint,
      }),
      usdLabel: usd.usdLabel,
      usdTotal: usd.usdTotal,
      members: members.length > 0 ? members : undefined,
    };
    if (id !== NATIVE_SOL_ID && total === 0) continue;
    merged.push(mergedRow);
  }

  return sortHomeTokenRows(merged);
}
